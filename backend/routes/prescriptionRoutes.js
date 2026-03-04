// backend/routes/prescriptionRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  generatePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
} from '../controllers/prescriptionController.js';

const router = express.Router();

// POST /api/prescriptions/generate   — Doctor triggers AI generation after call
router.post('/generate', protect, generatePrescription);

// GET  /api/prescriptions/patient/:patientId
router.get('/patient/:patientId', protect, getPatientPrescriptions);

// GET  /api/prescriptions/doctor/:doctorId
router.get('/doctor/:doctorId', protect, getDoctorPrescriptions);

// GET  /api/prescriptions/:id
router.get('/:id', protect, getPrescriptionById);

export default router;