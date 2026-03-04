// frontend/src/routes.jsx
import { Routes, Route } from 'react-router-dom';
import Navbar            from './components/Navbar.jsx';
import Login             from './pages/Login.jsx';
import Register          from './pages/Register.jsx';
import DoctorDashboard   from './Doctor/DoctorDashboard.jsx';
import PatientDashboard  from './Patient/PatientDashboard.jsx';
import ManageAppointments   from './Doctor/ManageAppointments.jsx';
import DoctorVideoConsultation from './Doctor/DoctorVideoConsultion.jsx';
import GeneratePrescription    from './Doctor/GeneratePrescription.jsx';
import BookAppointment    from './Patient/BookAppointment.jsx';
import JoinConsultation   from './Patient/JoinConsultation.jsx';
import MyPrescriptions    from './Patient/MyPrescriptions.jsx';       // ✅ Added
import PatientVideoCall   from './Patient/PatientVideoCall.jsx';
import ProtectedRoute     from './routes/ProtectedRoute.jsx';

const AppRouter = () => (
  <>
    <Navbar />
    <Routes>
      {/* ── Auth ── */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Doctor ── */}
      <Route path="/doctor/dashboard"     element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/appointments"  element={<ProtectedRoute role="doctor"><ManageAppointments /></ProtectedRoute>} />
      <Route path="/doctor/prescription"  element={<ProtectedRoute role="doctor"><GeneratePrescription /></ProtectedRoute>} />
      <Route path="/doctor/videoCall"     element={<ProtectedRoute role="doctor"><DoctorVideoConsultation /></ProtectedRoute>} />

      {/* ── Patient ── */}
      <Route path="/patient/dashboard"      element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/appointments"   element={<ProtectedRoute role="patient"><BookAppointment /></ProtectedRoute>} />
      <Route path="/patient/consultations"  element={<ProtectedRoute role="patient"><JoinConsultation /></ProtectedRoute>} />
      <Route path="/patient/prescriptions"  element={<ProtectedRoute role="patient"><MyPrescriptions /></ProtectedRoute>} /> {/* ✅ */}
      <Route path="/patient/videoCall"      element={<ProtectedRoute role="patient"><PatientVideoCall /></ProtectedRoute>} />

      {/* ── Default ── */}
      <Route path="/"  element={<Login />} />
      <Route path="*"  element={<Login />} />
    </Routes>
  </>
);

export default AppRouter;
