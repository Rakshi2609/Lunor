import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    default: '',
  },
  photoURL: {
    type: String,
    default: '',
  },
  googleId: {
    type: String,
    default: '',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Document automatically removed by MongoDB after 10 minutes (600s)
  },
});

export default mongoose.model('OtpVerification', otpVerificationSchema);
