// frontend/src/Patient/MyPrescriptions.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [error,         setError]         = useState('');
  const [verifying,     setVerifying]     = useState(null);
  const [acknowledging, setAcknowledging] = useState(null);
  const [notes,         setNotes]         = useState({});

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API}/api/prescriptions/patient/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrescriptions(res.data);
      } catch (err) {
        setError('Failed to load prescriptions');
      } finally {
        setLoading(false);
      }
    };
    if (user.id) fetch();
  }, [user.id]);

  const handleVerify = async (prescriptionId) => {
    setVerifying(prescriptionId);
    try {
      const res = await axios.post(
        `${API}/api/prescriptions/${prescriptionId}/verify`,
        { patientId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update the prescription in the list
      setPrescriptions(prescriptions.map(p => 
        p._id === prescriptionId ? res.data.prescription : p
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify prescription');
    } finally {
      setVerifying(null);
    }
  };

  const handleAcknowledge = async (prescriptionId) => {
    setAcknowledging(prescriptionId);
    try {
      const res = await axios.post(
        `${API}/api/prescriptions/${prescriptionId}/acknowledge`,
        { 
          patientId: user.id,
          verificationNotes: notes[prescriptionId] || ''
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update the prescription in the list
      setPrescriptions(prescriptions.map(p => 
        p._id === prescriptionId ? res.data.prescription : p
      ));
      // Clear notes
      setNotes({ ...notes, [prescriptionId]: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge prescription');
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" />
        <p className="mt-2">Loading prescriptions…</p>
      </div>
    );
  }

  if (error) return <div className="container mt-4 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <h3 className="mb-4">💊 My Prescriptions</h3>

      {prescriptions.length === 0 ? (
        <div className="text-center mt-5 text-muted">
          <div style={{ fontSize: 64 }}>📋</div>
          <h5>No prescriptions yet</h5>
          <p>Prescriptions will appear here after your consultations.</p>
        </div>
      ) : (
        <div className="row">
          {prescriptions.map(p => (
            <div key={p._id} className="col-md-6 mb-4">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
                  <div>
                    <strong>Dr. {p.doctorId?.name}</strong>
                    <br />
                    <small>{new Date(p.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div>
                    {p.prescriptionStatus === 'draft' && (
                      <span className="badge bg-secondary">📋 Draft</span>
                    )}
                    {p.prescriptionStatus === 'sent' && (
                      <span className="badge bg-warning">📨 New</span>
                    )}
                    {p.prescriptionStatus === 'verified' && (
                      <span className="badge bg-info">✓ Viewed</span>
                    )}
                    {p.prescriptionStatus === 'acknowledged' && (
                      <span className="badge bg-success">✓✓ Confirmed</span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p><strong>Specialization:</strong> {p.doctorId?.specialization || 'General'}</p>
                  <p><strong>Diagnosis:</strong> {p.diagnosis || '—'}</p>

                  {p.symptoms?.length > 0 && (
                    <p><strong>Symptoms:</strong> {p.symptoms.join(', ')}</p>
                  )}

                  {p.medications?.length > 0 && (
                    <>
                      <strong>Medications:</strong>
                      <ul className="mt-1">
                        {p.medications.map((m, i) => (
                          <li key={i}>
                            <strong>{m.name}</strong> — {m.dosage}, {m.frequency}
                            {m.duration && ` for ${m.duration}`}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {p.advice && <p className="mt-2"><strong>Advice:</strong> {p.advice}</p>}
                  {p.followUpDate && <p><strong>Follow-up:</strong> {p.followUpDate}</p>}

                  <div className="mt-3 d-flex gap-2">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setSelected(selected?._id === p._id ? null : p)}
                    >
                      {selected?._id === p._id ? 'Hide Details ▲' : 'Full Details ▼'}
                    </button>

                    {/* Verification Actions */}
                    {p.prescriptionStatus === 'sent' && (
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => handleVerify(p._id)}
                        disabled={verifying === p._id}
                      >
                        {verifying === p._id ? (
                          <><span className="spinner-border spinner-border-sm me-1" />Verifying…</>
                        ) : '✓ Mark as Viewed'}
                      </button>
                    )}

                    {(p.prescriptionStatus === 'verified' || p.prescriptionStatus === 'sent') && p.prescriptionStatus !== 'acknowledged' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => setSelected(selected?._id === p._id ? false : p)}
                        data-bs-toggle="collapse"
                        data-bs-target={`#acknowledge-${p._id}`}
                      >
                        ✓✓ Confirm
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded view */}
                {selected?._id === p._id && (
                  <div className="card-footer bg-light">
                    {p.labTests?.length > 0 && (
                      <p><strong>🧪 Lab Tests:</strong> {p.labTests.join(', ')}</p>
                    )}
                    {p.conversationSummary && (
                      <>
                        <strong>📝 Consultation Summary:</strong>
                        <p className="text-muted small mt-1">{p.conversationSummary}</p>
                      </>
                    )}
                    {p.aiGenerated && (
                      <span className="badge bg-info me-2">🤖 AI Generated</span>
                    )}

                    {/* Acknowledgement Section */}
                    {p.prescriptionStatus !== 'acknowledged' && (
                      <div className="mt-3 pt-3 border-top">
                        <h6>📝 Acknowledge Prescription</h6>
                        <textarea
                          className="form-control form-control-sm mb-2"
                          placeholder="Add any notes or concerns (optional)"
                          value={notes[p._id] || ''}
                          onChange={(e) => setNotes({ ...notes, [p._id]: e.target.value })}
                          rows="2"
                        />
                        <button
                          className="btn btn-success btn-sm w-100"
                          onClick={() => handleAcknowledge(p._id)}
                          disabled={acknowledging === p._id}
                        >
                          {acknowledging === p._id ? (
                            <><span className="spinner-border spinner-border-sm me-1" />Confirming…</>
                          ) : '✓ Confirm Receipt'}
                        </button>
                      </div>
                    )}

                    {/* Acknowledgement Status */}
                    {p.prescriptionStatus === 'acknowledged' && (
                      <div className="alert alert-success mt-3 mb-0">
                        <strong>✓ Receipt Confirmed</strong>
                        <br />
                        <small>Confirmed at: {new Date(p.acknowledgedAt).toLocaleString()}</small>
                        {p.verificationNotes && (
                          <p className="mb-0 mt-2"><strong>Notes:</strong> {p.verificationNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPrescriptions;
