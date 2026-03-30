// frontend/src/Doctor/GeneratePrescription.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GeneratePrescription = () => {
  const [appointments, setAppointments] = useState([]);
  const [transcriptFiles, setTranscriptFiles] = useState([]);
  const [form, setForm] = useState({
    appointmentId: '',
    patientId:     '',
    patientName:   '',
    transcriptFile: '',
  });
  const [loading,      setLoading]      = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [error,        setError]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [sendSuccess,  setSendSuccess]  = useState(false);

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Load doctor's appointments and available transcripts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch appointments where this doctor is involved
        const appointmentsRes = await axios.get(
          `${API}/api/prescriptions/doctor/${user.id}/appointments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAppointments(appointmentsRes.data || []);

        // Fetch available transcript files
        const filesRes = await axios.get(`${API}/api/transcripts/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTranscriptFiles(filesRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [user.id, token]);

  // When appointment is selected, auto-populate patient info
  const handleAppointmentSelect = (e) => {
    const selectedId = e.target.value;
    const selected = appointments.find(apt => apt.appointmentId === selectedId);
    
    if (selected) {
      setForm({
        appointmentId: selected.appointmentId,
        patientId: selected.patientId,
        patientName: selected.patientName,
        transcriptFile: `${selected.patientName}.json`, // Default to patient name format
      });
    } else {
      setForm({ appointmentId: '', patientId: '', patientName: '', transcriptFile: '' });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/prescriptions/generate`,
        { 
          ...form, 
          doctorId: user.id 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrescription(res.data.prescription);
      setSendSuccess(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPatient = async () => {
    setSending(true);
    setError('');

    try {
      const res = await axios.post(
        `${API}/api/prescriptions/${prescription._id}/send`,
        { doctorId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrescription(res.data.prescription);
      setSendSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send prescription');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4">🤖 AI Generate Prescription</h3>
      <p className="text-muted">
        Select a patient from your appointments, choose the transcript file, and generate a structured 
        prescription using Claude AI.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card p-4 shadow-sm mb-4">
        <form onSubmit={handleGenerate}>
          <div className="mb-3">
            <label className="form-label">Select Patient *</label>
            <select
              className="form-select"
              value={form.appointmentId}
              onChange={handleAppointmentSelect}
              required
            >
              <option value="">-- Select a patient from your appointments --</option>
              {appointments.map(apt => (
                <option key={apt.appointmentId} value={apt.appointmentId}>
                  {apt.patientName} (Scheduled: {new Date(apt.scheduledDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {form.patientName && (
            <>
              <div className="mb-3">
                <label className="form-label">Patient Name</label>
                <input
                  className="form-control"
                  value={form.patientName}
                  disabled
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Appointment ID</label>
                <input
                  className="form-control"
                  value={form.appointmentId}
                  disabled
                />
              </div>
            </>
          )}

          <div className="mb-3">
            <label className="form-label">Transcript File *</label>
            {transcriptFiles.length > 0 ? (
              <select
                className="form-select"
                value={form.transcriptFile}
                onChange={e => setForm({ ...form, transcriptFile: e.target.value })}
                required
              >
                <option value="">-- Select transcript --</option>
                {transcriptFiles.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-control"
                placeholder={
                  form.patientName 
                    ? `${form.patientName}.json` 
                    : 'e.g. transaction-abc123-1700000000.json'
                }
                value={form.transcriptFile}
                onChange={e => setForm({ ...form, transcriptFile: e.target.value })}
                required
              />
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !form.appointmentId}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" />Generating with AI…</>
            ) : '⚡ Generate Prescription'}
          </button>
        </form>
      </div>

      {/* ── Prescription Preview ── */}
      {prescription && (
        <div className="card p-4 shadow border-success">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h4 className="text-success mb-0">✅ Prescription Generated</h4>
              <small className="text-muted">Status: {prescription.prescriptionStatus}</small>
            </div>
            <div>
              {prescription.prescriptionStatus === 'draft' && (
                <button
                  className="btn btn-success"
                  onClick={handleSendToPatient}
                  disabled={sending}
                >
                  {sending ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Sending…</>
                  ) : '📤 Send to Patient'}
                </button>
              )}
              {prescription.prescriptionStatus === 'sent' && (
                <span className="badge bg-info">✓ Sent to Patient</span>
              )}
              {prescription.prescriptionStatus === 'verified' && (
                <span className="badge bg-warning">✓ Verified by Patient</span>
              )}
              {prescription.prescriptionStatus === 'acknowledged' && (
                <span className="badge bg-success">✓ Acknowledged</span>
              )}
            </div>
          </div>

          {prescription.sentAt && (
            <p className="text-muted mb-2">
              <small>📨 Sent at: {new Date(prescription.sentAt).toLocaleString()}</small>
            </p>
          )}

          <div className="row mb-3">
            <div className="col-md-6">
              <p><strong>Patient:</strong> {prescription.patientId?.name}</p>
              <p><strong>Age:</strong>     {prescription.patientId?.age}</p>
              <p><strong>Contact:</strong> {prescription.patientId?.contact}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Doctor:</strong>         {prescription.doctorId?.name}</p>
              <p><strong>Specialization:</strong> {prescription.doctorId?.specialization}</p>
              <p><strong>Date:</strong>            {new Date(prescription.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <hr />

          <p><strong>📋 Diagnosis:</strong> {prescription.diagnosis}</p>
          <p><strong>🤒 Symptoms:</strong>  {prescription.symptoms?.join(', ')}</p>

          {prescription.medications?.length > 0 && (
            <>
              <h5 className="mt-3">💊 Medications</h5>
              <table className="table table-bordered table-sm">
                <thead className="table-light">
                  <tr><th>Drug</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
                </thead>
                <tbody>
                  {prescription.medications.map((m, i) => (
                    <tr key={i}>
                      <td>{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td>
                      <td>{m.duration}</td><td>{m.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {prescription.labTests?.length > 0 && (
            <p><strong>🧪 Lab Tests:</strong> {prescription.labTests.join(', ')}</p>
          )}

          <p><strong>📝 Advice:</strong>     {prescription.advice}</p>
          <p><strong>📅 Follow-up:</strong>  {prescription.followUpDate}</p>
          <p className="text-muted mt-2"><small>🤖 AI Generated | Saved to database</small></p>
        </div>
      )}
    </div>
  );
};

export default GeneratePrescription;
