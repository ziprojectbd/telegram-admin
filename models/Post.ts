import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  mediaUrl: String,
  mediaType: String, // image | video | document
  scheduledAt: Date,
  published: { type: Boolean, default: false },
  publishedAt: Date,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  telegramChatId: String, // channel/group where it was posted
  telegramMessageId: Number, // message ID in that Telegram chat
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model('Post', PostSchema);