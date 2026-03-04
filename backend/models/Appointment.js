// backend/models/Appointment.js
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  preferredDate:     { type: Date   },
  preferredTime:     { type: String },   // HH:mm

  scheduledDate:     { type: Date   },
  scheduledTime:     { type: String },   // HH:mm set by doctor

  status: {
    type:    String,
    enum:    ['pending', 'accepted', 'completed', 'rejected'],
    default: 'pending',
  },

  symptoms:          { type: String },
  isEmergency:       { type: Boolean, default: false },
  emergencyKeywords: [{ type: String }],

  // ✅ Pre-calculated heap priority score stored for display
  priorityScore:     { type: Number, default: 0 },

}, { timestamps: true });

export default mongoose.model('Appointment', appointmentSchema);