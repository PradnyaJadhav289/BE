// backend/socket.js
import { Server } from 'socket.io';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.FRONTEND_URL,
      ].filter(Boolean),
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // ── Room Join ──────────────────────────────────────────────────────────────
    // ✅ Fixed: frontend was sending positional args (roomId, userId, userName, role)
    //          backend was destructuring an object → mismatch.
    //          Now handles BOTH calling conventions.
    socket.on('join-room', (roomIdOrObj, userId, userName, role) => {
      let roomId, uid, uname, urole;

      if (typeof roomIdOrObj === 'object' && roomIdOrObj !== null) {
        // Object style: { roomId, userId, role }
        ({ roomId, userId: uid, role: urole } = roomIdOrObj);
        uname = uid;
      } else {
        // Positional style: (roomId, userId, userName, role)
        roomId = roomIdOrObj;
        uid    = userId;
        uname  = userName;
        urole  = role;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = uid;
      socket.data.role   = urole;

      console.log(`${urole} (${uid}) joined room: ${roomId}`);

      // Notify others in room
      socket.to(roomId).emit('user-joined', uid, uname);
    });

    // ── Leave room on disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { roomId, userId } = socket.data || {};
      if (roomId) socket.to(roomId).emit('user-left', userId, userId);
      console.log('❌ User disconnected:', socket.id);
    });

    // ── Call Signaling ─────────────────────────────────────────────────────────
    socket.on('incoming-call', (data) => {
      socket.to(data.roomId).emit('incoming-call', data);
    });

    socket.on('accept-call', (data) => {
      socket.to(data.roomId).emit('call-accepted', data);
    });

    socket.on('reject-call', (data) => {
      socket.to(data.roomId).emit('call-rejected', data);
    });

    // ── WebRTC Signaling ───────────────────────────────────────────────────────
    socket.on('offer', (data) => {
      socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
      socket.to(data.roomId).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
      socket.to(data.roomId).emit('ice-candidate', data);
    });

    // ── End Call ───────────────────────────────────────────────────────────────
    socket.on('end-call', ({ roomId }) => {
      io.to(roomId).emit('call-ended');
    });
  });

  return io;
};