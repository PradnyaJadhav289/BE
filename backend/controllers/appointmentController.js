// controllers/appointmentController.js
import Appointment from "../models/Appointment.js";

// ✅ Patient - get only accepted appointments
export const getAcceptedAppointmentsByPatient = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.user._id, // from token
      status: "Accepted",
    }).populate("doctorId", "name speciality");

    res.json(appointments);
  } catch (err) {
    console.error("Error fetching accepted appointments:", err);
    res.status(500).json({ message: "Failed to fetch accepted appointments" });
  }
};

// ✅ Common fetch for doctor/patient dashboard
export const getMyAppointments = async (req, res) => {
  try {
    const filter =
      req.user.role === "doctor"
        ? { doctor: req.user._id }
        : { patient: req.user._id };

    const appointments = await Appointment.find(filter).populate(
      "patient doctor",
      "name email role"
    );

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

export const updateAppointmentSchedule = async (req, res) => {
    try {
        const { appointmentId, scheduledDate, scheduledTime } = req.body;
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: "Appointment not found" });

        appointment.scheduledDate = scheduledDate;
        appointment.scheduledTime = scheduledTime;

        await appointment.save();
        res.status(200).json(appointment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
