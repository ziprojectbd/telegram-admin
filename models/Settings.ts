import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  botToken: { type: String, default: '' },
  telegramChatId: { type: String, default: '' },
  webhookSecret: { type: String, default: '' },
  demoEmail: { type: String, default: '' },
  demoPassword: { type: String, default: '' },
  autoReplyEnabled: { type: Boolean, default: false },
  welcomeMessage: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);