import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  botToken: { type: String, default: '' },
  telegramChatId: { type: String, default: '' },
  adminEmail: { type: String, default: '' },
  adminPassword: { type: String, default: '' },
  mongodbUri: { type: String, default: '' },
  autoReplyEnabled: { type: Boolean, default: false },
  welcomeMessage: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);