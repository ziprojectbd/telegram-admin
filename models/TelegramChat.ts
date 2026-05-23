import mongoose from 'mongoose';

const TelegramChatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['private', 'group', 'channel'], required: true },
  username: String,
  firstName: String,
  lastName: String,
  phone: String,
  profilePhoto: String,
  isBotUser: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  lastMessageAt: Date,
}, { timestamps: true });

export default mongoose.models.TelegramChat || mongoose.model('TelegramChat', TelegramChatSchema);