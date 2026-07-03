import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
  isRevoked: { type: Boolean, default: false },
  replacedByToken: { type: String, default: null },
  userAgent:  { type: String, default: '' },
  ipAddress:  { type: String, default: '' },
}, { timestamps: true });

// TTL index: MongoDB automatically deletes expired token documents
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
