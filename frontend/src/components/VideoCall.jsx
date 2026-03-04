// frontend/src/components/VideoCall.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ✅ Fixed: unified prop interface — accepts BOTH calling conventions:
//   1) <VideoCall room="xyz"  role="doctor"  userId="abc" />
//   2) <VideoCall appointmentId="xyz" userRole="patient" doctorId="d" patientId="p" onCallEnd={fn} />
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VideoCall = (props) => {
  // ── Normalise props ──────────────────────────────────────────────────────────
  const userRole   = props.role     || props.userRole || 'patient';
  const roomId     = props.room     || (props.appointmentId ? `appointment-${props.appointmentId}` : 'defaultRoom');
  const user       = JSON.parse(localStorage.getItem('user') || '{}');
  const userId     = props.userId   || user.id;
  const onCallEnd  = props.onCallEnd;

  // ── State ────────────────────────────────────────────────────────────────────
  const [callStatus,      setCallStatus]      = useState('initializing');
  const [isAudioMuted,    setIsAudioMuted]    = useState(false);
  const [isVideoOff,      setIsVideoOff]      = useState(false);
  const [connectedUsers,  setConnectedUsers]  = useState([]);
  const [incomingCall,    setIncomingCall]    = useState(null);
  const [isRinging,       setIsRinging]       = useState(false);
  const [callDuration,    setCallDuration]    = useState(0);
  const [error,           setError]           = useState(null);
  const [hasRemoteVideo,  setHasRemoteVideo]  = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef      = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef       = useRef(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  const cleanup = useCallback((notifyRemote = false) => {
    clearInterval(timerRef.current);
    if (notifyRemote && socketRef.current) {
      socketRef.current.emit('end-call', { roomId });
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    setCallStatus('ended');
    setConnectedUsers([]);
    setCallDuration(0);
    setHasRemoteVideo(false);
    if (onCallEnd) onCallEnd();
  }, [roomId, onCallEnd]);

  // ── Peer Connection ───────────────────────────────────────────────────────────
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      setHasRemoteVideo(true);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { candidate: e.candidate, roomId });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected')    { setCallStatus('connected'); startTimer(); }
      if (s === 'disconnected') { setCallStatus('disconnected'); }
      if (s === 'failed')       { setError('Connection failed. Please retry.'); setCallStatus('failed'); }
    };

    return pc;
  }, [roomId]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  // ── Initiate Call (sends offer) ──────────────────────────────────────────────
  const initiateCall = useCallback(async () => {
    try {
      setCallStatus('calling');
      const pc = createPC();
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('incoming-call', { roomId, fromUserId: userId, fromUserName: user.name, fromUserRole: userRole });
      socketRef.current?.emit('offer',         { roomId, offer, fromUserId: userId, fromUserName: user.name });
    } catch (err) {
      setError('Failed to initiate call');
      setCallStatus('ready');
    }
  }, [createPC, roomId, userId, user.name, userRole]);

  // ── Handle incoming offer ────────────────────────────────────────────────────
  const handleOffer = useCallback(async ({ offer }) => {
    const pc = createPC();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('answer', { roomId, answer, fromUserId: userId, fromUserName: user.name });
  }, [createPC, roomId, userId, user.name]);

  const handleAnswer = useCallback(async ({ answer }) => {
    if (pcRef.current?.signalingState === 'have-local-offer') {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIce = useCallback(async ({ candidate }) => {
    if (pcRef.current?.remoteDescription) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  }, []);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1. Get media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setError('Camera/mic access denied. Please allow permissions.');
        setCallStatus('error');
        return;
      }

      // 2. Connect socket
      const socket = io(API_BASE, { transports: ['websocket', 'polling'], forceNew: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        // ✅ Fixed: positional args to match updated socket.js
        socket.emit('join-room', roomId, userId, user.name, userRole);
        setCallStatus('ready');
      });

      socket.on('user-joined', (uid, uname) => {
        if (!mounted) return;
        setConnectedUsers(prev => [...prev.filter(u => u.id !== uid), { id: uid, name: uname }]);
        // Doctor side auto-initiates when patient joins
        if (userRole === 'doctor') {
          setTimeout(() => { if (mounted) initiateCall(); }, 1000);
        }
      });

      socket.on('user-left', (uid) => setConnectedUsers(prev => prev.filter(u => u.id !== uid)));

      socket.on('incoming-call', (data) => {
        if (!mounted) return;
        setIncomingCall(data);
        setIsRinging(true);
        setCallStatus('ringing');
      });

      socket.on('call-accepted', () => { setIsRinging(false); setCallStatus('connecting'); });
      socket.on('call-rejected', () => { setCallStatus('ready'); setTimeout(() => {}, 2000); });

      socket.on('offer',         handleOffer);
      socket.on('answer',        handleAnswer);
      socket.on('ice-candidate', handleIce);
      socket.on('call-ended',    () => cleanup(false));
      socket.on('connect_error', () => setError('Server connection failed'));
    })();

    return () => {
      mounted = false;
      cleanup(false);
    };
  }, []); // eslint-disable-line

  // ── Controls ─────────────────────────────────────────────────────────────────
  const acceptCall = () => {
    setIsRinging(false);
    setIncomingCall(null);
    setCallStatus('connecting');
    socketRef.current?.emit('accept-call', { roomId, fromUserId: userId, fromUserName: user.name, fromUserRole: userRole });
  };

  const rejectCall = () => {
    socketRef.current?.emit('reject-call', { roomId, fromUserId: userId, fromUserName: user.name });
    setIsRinging(false);
    setIncomingCall(null);
    setCallStatus('ready');
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsAudioMuted(!track.enabled); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const statusColor = {
    connected: 'success', connecting: 'info', calling: 'info', ready: 'secondary',
    error: 'danger', failed: 'danger', ringing: 'warning', ended: 'secondary',
  }[callStatus] || 'secondary';

  const statusText = {
    initializing: 'Initializing…',
    ready:        `Ready (${connectedUsers.length} in room)`,
    calling:      'Calling…',
    ringing:      'Incoming call…',
    connecting:   'Connecting…',
    connected:    `Connected — ${fmt(callDuration)}`,
    disconnected: 'Disconnected',
    failed:       'Connection failed',
    error:        'Error',
    ended:        'Call ended',
  }[callStatus] || callStatus;

  return (
    <div className="video-call-system d-flex flex-column" style={{ height: '100%', minHeight: '480px' }}>

      {/* ── Incoming Call Modal ── */}
      {isRinging && incomingCall && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">📞 Incoming Video Call</h5>
              </div>
              <div className="modal-body text-center py-4">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                     style={{ width: 80, height: 80, fontSize: 32 }}>
                  👤
                </div>
                <h4>{incomingCall.fromUserName || 'Unknown'}</h4>
                <p className="text-muted">is calling you for a video consultation</p>
                <div className="d-flex gap-3 justify-content-center mt-3">
                  <button className="btn btn-success btn-lg px-4" onClick={acceptCall}>✅ Accept</button>
                  <button className="btn btn-danger  btn-lg px-4" onClick={rejectCall}>❌ Decline</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Bar ── */}
      <div className="d-flex justify-content-between align-items-center bg-light px-3 py-2 border-bottom">
        <span className={`badge bg-${statusColor} fs-6`}>{statusText}</span>
        <small className="text-muted">{user.name} ({userRole})</small>
      </div>

      {/* ── Video Area ── */}
      <div className="flex-grow-1 position-relative bg-dark" style={{ minHeight: '300px' }}>
        {/* Remote */}
        <video ref={remoteVideoRef} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'cover' }} />

        {!hasRemoteVideo && (
          <div className="position-absolute top-50 start-50 translate-middle text-white text-center">
            <div style={{ fontSize: 64 }}>👤</div>
            <p className="mt-2 opacity-75">
              {callStatus === 'calling' ? 'Ringing…' : callStatus === 'connecting' ? 'Connecting…' : 'Waiting for other participant'}
            </p>
          </div>
        )}

        {/* Local (PiP) */}
        <div className="position-absolute" style={{ bottom: 16, right: 16, width: 180, height: 120, zIndex: 10 }}>
          <video ref={localVideoRef} autoPlay muted playsInline
                 className="w-100 h-100"
                 style={{ objectFit: 'cover', borderRadius: 8, border: '2px solid white' }} />
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="d-flex justify-content-center gap-2 p-3 bg-light border-top">
        {/* Patient can manually start call */}
        {callStatus === 'ready' && userRole === 'patient' && connectedUsers.length > 0 && (
          <button className="btn btn-success btn-lg" onClick={initiateCall}>📹 Start Call</button>
        )}

        {['calling', 'connecting', 'connected'].includes(callStatus) && (
          <>
            <button className={`btn ${isAudioMuted ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={toggleAudio}>
              {isAudioMuted ? '🔇' : '🎙️'}
            </button>
            <button className={`btn ${isVideoOff ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={toggleVideo}>
              {isVideoOff ? '📵' : '📹'}
            </button>
            <button className="btn btn-danger px-4" onClick={() => cleanup(true)}>📵 End Call</button>
          </>
        )}

        {['error', 'failed'].includes(callStatus) && (
          <button className="btn btn-primary" onClick={() => window.location.reload()}>🔄 Retry</button>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 3000 }}>
          <div className="alert alert-danger d-flex align-items-center">
            ⚠️ <span className="ms-2">{error}</span>
            <button className="btn-close ms-3" onClick={() => setError(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
