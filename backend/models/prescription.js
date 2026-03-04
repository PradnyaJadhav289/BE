// backend/models/Prescription.js
import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  dosage:       { type: String, required: true },
  frequency:    { type: String, required: true },
  duration:     { type: String },
  instructions: { type: String },
});

const prescriptionSchema = new mongoose.Schema({
  appointmentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patientId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
  doctorId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },

  // AI-generated structured data from transcript
  diagnosis:           { type: String },
  symptoms:            [{ type: String }],
  medications:         [medicationSchema],
  labTests:            [{ type: String }],
  advice:              { type: String },
  conversationSummary: { type: String },
  followUpDate:        { type: String },   // relative string e.g. "1 week"

  // Source data
  transcriptFile:      { type: String },   // filename saved in /upload
  rawTranscript:       { type: mongoose.Schema.Types.Mixed }, // full conversation array
  aiGenerated:         { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);