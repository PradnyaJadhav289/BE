// backend/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  role:           { type: String, enum: ['doctor', 'patient'], required: true }, // ✅ only once
  contact:        { type: String, required: true },
  age:            { type: Number, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  specialization: { type: String },           // for doctors
  location:       { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);