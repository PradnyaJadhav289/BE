// frontend/src/Doctor/GeneratePrescription.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GeneratePrescription = () => {
  const [transcriptFiles, setTranscriptFiles] = useState([]);
  const [form, setForm] = useState({
    appointmentId: '',
    patientId:     '',
    transcriptFile: '',
  });
  const [loading,      setLoading]      = useState(false);
  const [prescription, setPrescription] = useState(null);
  const [error,        setError]        = useState('');

  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Load list of saved transcripts from server  (list /upload directory)
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(`${API}/api/transcripts/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTranscriptFiles(res.data || []);
      } catch {
        // Endpoint may not exist yet — silently ignore
      }
    };
    fetchFiles();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/api/prescriptions/generate`,
        { ...form, doctorId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrescription(res.data.prescription);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4">🤖 AI Generate Prescription</h3>
      <p className="text-muted">
        After a video consultation, select the saved transcript to generate a structured prescription
        using Claude AI.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card p-4 shadow-sm mb-4">
        <form onSubmit={handleGenerate}>
          <div className="mb-3">
            <label className="form-label">Appointment ID *</label>
            <input
              className="form-control"
              placeholder="Paste appointment _id from MongoDB"
              value={form.appointmentId}
              onChange={e => setForm({ ...form, appointmentId: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Patient ID *</label>
            <input
              className="form-control"
              placeholder="Patient's user _id"
              value={form.patientId}
              onChange={e => setForm({ ...form, patientId: e.target.value })}
              required
            />
          </div>

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
                placeholder="e.g. transcript-abc123-1700000000.json"
                value={form.transcriptFile}
                onChange={e => setForm({ ...form, transcriptFile: e.target.value })}
                required
              />
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" />Generating with AI…</>
            ) : '⚡ Generate Prescription'}
          </button>
        </form>
      </div>

      {/* ── Prescription Preview ── */}
      {prescription && (
        <div className="card p-4 shadow border-success">
          <h4 className="text-success mb-3">✅ Prescription Generated</h4>

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
