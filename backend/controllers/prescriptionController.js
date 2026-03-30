// backend/controllers/prescriptionController.js
// Uses Claude (Anthropic) AI to parse doctor-patient transcript → structured prescription
// Model: claude-sonnet-4-20250514  (claude-sonnet-4-6 in API string)
// Technique: Structured Output via System Prompt + JSON parsing

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import Prescription from '../models/prescription.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── AI System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert medical AI trained to extract structured prescription 
data from doctor-patient consultation transcripts.

Your ONLY output must be valid JSON — no preamble, no markdown fences, no explanation.

Return exactly this structure:
{
  "diagnosis": "primary diagnosis string",
  "symptoms": ["symptom1", "symptom2"],
  "medications": [
    {
      "name": "drug name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. twice daily",
      "duration": "e.g. 5 days",
      "instructions": "e.g. take after food"
    }
  ],
  "labTests": ["CBC", "Urine culture"],
  "advice": "lifestyle/diet advice from doctor",
  "followUpDate": "e.g. after 1 week",
  "conversationSummary": "2-3 sentence summary of the consultation"
}

If a field has no data, use null for strings or [] for arrays. Never guess medications — 
only extract what the doctor explicitly mentioned.`;

// ── Get Doctor's Appointments with Patient Details ─────────────────────────────
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Fetch all completed/accepted appointments for this doctor
    const appointments = await Appointment.find({ 
      doctor: doctorId,
      status: { $in: ['completed', 'accepted'] }
    })
      .populate('patient', 'name age contact location')
      .sort({ createdAt: -1 });

    // Return simplified data for dropdown
    const appointmentList = appointments.map(apt => ({
      appointmentId: apt._id,
      patientId: apt.patient._id,
      patientName: apt.patient.name,
      scheduledDate: apt.scheduledDate,
      symptoms: apt.symptoms,
    }));

    res.json(appointmentList);
  } catch (err) {
    console.error('getDoctorAppointments error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments', detail: err.message });
  }
};

// ── AI System Prompt ───────────────────────────────────────────────────────────

// ── Generate Prescription from Transcript ─────────────────────────────────────
export const generatePrescription = async (req, res) => {
  try {
    const { appointmentId, patientId, patientName, doctorId, transcriptFile } = req.body;

    if (!appointmentId || !patientId || !doctorId || !transcriptFile) {
      return res.status(400).json({ error: 'appointmentId, patientId, doctorId, transcriptFile are required' });
    }

    // Read transcript JSON from /upload folder
    // Support both old format (abc123.json) and new patient-name format (PatientName.json)
    let filePath = path.join(process.cwd(), 'upload', transcriptFile);
    
    // If file doesn't exist and doesn't have extension, try with patient name
    if (!fs.existsSync(filePath) && !transcriptFile.endsWith('.json')) {
      filePath = path.join(process.cwd(), 'upload', `${patientName}.json`);
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Transcript file not found', attempted: filePath });
    }

    const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const conversation   = transcriptData.conversation || [];

    if (conversation.length === 0) {
      return res.status(400).json({ error: 'Transcript is empty' });
    }

    // Format for Claude
    const formattedConvo = conversation
      .map(msg => `${msg.speaker.toUpperCase()}: ${msg.translated || msg.message}`)
      .join('\n');

    // ── Call Claude AI ──────────────────────────────────────────────────────────
    // Model used: claude-sonnet-4-6  (Claude Sonnet 4.6)
    // Technique: Zero-shot Structured Output Extraction
    // Input: raw conversation text
    // Output: structured JSON prescription
    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages: [{
        role:    'user',
        content: `Extract the medical prescription from this consultation transcript:\n\n${formattedConvo}`,
      }],
    });

    const rawText  = aiResponse.content[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();

    let prescriptionData;
    try {
      prescriptionData = JSON.parse(cleanJson);
    } catch {
      return res.status(500).json({ error: 'AI returned invalid JSON', raw: rawText });
    }

    // ── Save to MongoDB ─────────────────────────────────────────────────────────
    const prescription = await Prescription.create({
      appointmentId,
      patientId,
      doctorId,
      transcriptFile,
      rawTranscript:       conversation,
      diagnosis:           prescriptionData.diagnosis,
      symptoms:            prescriptionData.symptoms            || [],
      medications:         prescriptionData.medications         || [],
      labTests:            prescriptionData.labTests            || [],
      advice:              prescriptionData.advice,
      followUpDate:        prescriptionData.followUpDate,
      conversationSummary: prescriptionData.conversationSummary,
      aiGenerated:         true,
    });

    await prescription.populate([
      { path: 'patientId', select: 'name age contact location' },
      { path: 'doctorId',  select: 'name specialization contact' },
    ]);

    res.status(201).json({ prescription });
  } catch (err) {
    console.error('generatePrescription error:', err);
    res.status(500).json({ error: 'Failed to generate prescription', detail: err.message });
  }
};

// ── Get All Prescriptions for a Patient ───────────────────────────────────────
export const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId })
      .populate('doctorId',      'name specialization')
      .populate('appointmentId', 'preferredDate scheduledDate')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

// ── Get All Prescriptions by a Doctor ─────────────────────────────────────────
export const getDoctorPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ doctorId: req.params.doctorId })
      .populate('patientId',     'name age contact')
      .populate('appointmentId', 'preferredDate scheduledDate')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

// ── Get Single Prescription ────────────────────────────────────────────────────
export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name age contact location')
      .populate('doctorId',  'name specialization contact');

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
};

// ── Doctor Sends Prescription to Patient ──────────────────────────────────────
export const sendPrescriptionToPatient = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { doctorId } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verify the doctor owns this prescription
    if (prescription.doctorId.toString() !== doctorId) {
      return res.status(403).json({ error: 'Unauthorized: Only the prescribing doctor can send' });
    }

    // Update status to 'sent'
    prescription.prescriptionStatus = 'sent';
    prescription.sentAt = new Date();
    await prescription.save();

    await prescription.populate([
      { path: 'patientId', select: 'name email age contact' },
      { path: 'doctorId',  select: 'name specialization email' },
    ]);

    res.status(200).json({ 
      message: 'Prescription sent to patient successfully',
      prescription 
    });
  } catch (err) {
    console.error('sendPrescriptionToPatient error:', err);
    res.status(500).json({ error: 'Failed to send prescription', detail: err.message });
  }
};

// ── Patient Verifies/Views Prescription ───────────────────────────────────────
export const verifyprescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { patientId } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verify the patient owns this prescription
    if (prescription.patientId.toString() !== patientId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot verify others\' prescriptions' });
    }

    // Update status to 'verified'
    prescription.prescriptionStatus = 'verified';
    prescription.verifiedAt = new Date();
    await prescription.save();

    await prescription.populate([
      { path: 'patientId', select: 'name age contact' },
      { path: 'doctorId',  select: 'name specialization' },
    ]);

    res.status(200).json({ 
      message: 'Prescription verified successfully',
      prescription 
    });
  } catch (err) {
    console.error('verifyprescription error:', err);
    res.status(500).json({ error: 'Failed to verify prescription', detail: err.message });
  }
};

// ── Patient Acknowledges Prescription ─────────────────────────────────────────
export const acknowledgePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { patientId, verificationNotes } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Verify the patient owns this prescription
    if (prescription.patientId.toString() !== patientId) {
      return res.status(403).json({ error: 'Unauthorized: Cannot acknowledge others\' prescriptions' });
    }

    // Update status to 'acknowledged'
    prescription.prescriptionStatus = 'acknowledged';
    prescription.acknowledgedAt = new Date();
    if (verificationNotes) {
      prescription.verificationNotes = verificationNotes;
    }
    // If not yet verified, mark as verified too
    if (!prescription.verifiedAt) {
      prescription.verifiedAt = new Date();
    }
    await prescription.save();

    await prescription.populate([
      { path: 'patientId', select: 'name age contact' },
      { path: 'doctorId',  select: 'name specialization' },
    ]);

    res.status(200).json({ 
      message: 'Prescription acknowledged successfully',
      prescription 
    });
  } catch (err) {
    console.error('acknowledgePrescription error:', err);
    res.status(500).json({ error: 'Failed to acknowledge prescription', detail: err.message });
  }
};