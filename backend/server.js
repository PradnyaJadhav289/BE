// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes        from './routes/authRoutes.js';
import doctorRoutes      from './routes/doctorsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import videoRoutes       from './routes/videoRoutes.js';
import speechRoutes      from './routes/speechRoutes.js';
import transcriptRoutes  from './routes/transcriptRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js'; // ✅ Added
import { initializeSocket } from './socket.js';

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
initializeSocket(server);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/doctors',       doctorRoutes);
app.use('/api/appointments',  appointmentRoutes);
app.use('/api/video',         videoRoutes);
app.use('/api/speech',        speechRoutes);
app.use('/api/prescriptions', prescriptionRoutes); // ✅ Added
app.use('/api',               transcriptRoutes);

app.get('/', (_, res) => res.send('🩺 Doctor-Patient Backend Running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));