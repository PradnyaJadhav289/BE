// backend/routes/prescriptionRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  generatePrescription,
  getDoctorAppointments,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
  sendPrescriptionToPatient,
  verifyprescription,
  acknowledgePrescription,
} from '../controllers/prescriptionController.js';

const router = express.Router();

// GET  /api/prescriptions/doctor/:doctorId/appointments  — Get doctor's appointments for dropdown
router.get('/doctor/:doctorId/appointments', protect, getDoctorAppointments);

// POST /api/prescriptions/generate   — Doctor triggers AI generation after call
router.post('/generate', protect, generatePrescription);

// POST /api/prescriptions/:prescriptionId/send   — Doctor sends prescription to patient
router.post('/:prescriptionId/send', protect, sendPrescriptionToPatient);

// POST /api/prescriptions/:prescriptionId/verify   — Patient verifies/reads prescription
router.post('/:prescriptionId/verify', protect, verifyprescription);

// POST /api/prescriptions/:prescriptionId/acknowledge   — Patient acknowledges prescription
router.post('/:prescriptionId/acknowledge', protect, acknowledgePrescription);

// GET  /api/prescriptions/patient/:patientId
router.get('/patient/:patientId', protect, getPatientPrescriptions);

// GET  /api/prescriptions/doctor/:doctorId
router.get('/doctor/:doctorId', protect, getDoctorPrescriptions);

// GET  /api/prescriptions/:id
router.get('/:id', protect, getPrescriptionById);

export default router;