// frontend/src/Patient/MyPrescriptions.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MyPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [error,         setError]         = useState('');

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
                  <strong>Dr. {p.doctorId?.name}</strong>
                  <small>{new Date(p.createdAt).toLocaleDateString()}</small>
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

                  <button
                    className="btn btn-outline-primary btn-sm mt-2"
                    onClick={() => setSelected(selected?._id === p._id ? null : p)}
                  >
                    {selected?._id === p._id ? 'Hide Details ▲' : 'Full Details ▼'}
                  </button>
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
                      <span className="badge bg-info">🤖 AI Generated</span>
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
