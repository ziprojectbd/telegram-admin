import mongoose from 'mongoose';

const TelegramMessageSchema = new mongoose.Schema({
  messageId: { type: Number, required: true },
  chatId: { type: String, required: true },
  fromId: String,
  text: String,
  mediaUrl: String,
  mediaType: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.TelegramMessage || mongoose.model('TelegramMessage', TelegramMessageSchema);