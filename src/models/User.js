import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nameEncrypted: { type: String, required: true },
    phoneEncrypted: { type: String, required: true },
    phoneHash: { type: String, required: true, unique: true, select: false },
    profileImage: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['farmer', 'fisherman', 'disaster_manager', 'citizen', 'other'],
    },
    customCategory: { type: String, trim: true, maxlength: 80 },
  },
  { timestamps: true, collection: 'users' }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;