import TelegramBot from 'node-telegram-bot-api';
import dbConnect from './db';
import TelegramChat from '@/models/TelegramChat';
import TelegramMessage from '@/models/TelegramMessage';
import { startScheduler } from './scheduler';
import Settings from '@/models/Settings';

const isLocalDev =
  process.env.NEXTAUTH_URL?.includes('localhost') ||
  process.env.NEXTAUTH_URL?.includes('127.0.0.1');

// Always init without polling to prevent 409 conflicts on hot reload
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
  polling: false,
});

// Use global flag so polling starts only ONCE across Next.js hot reloads
if (isLocalDev && !(global as any).__botPollingStarted) {
  (global as any).__botPollingStarted = true;
  bot.startPolling().catch((err) => {
    console.error('Failed to start polling:', err);
  });
  console.log('✅ Telegram bot polling started (single instance)');
}

// Start the scheduled posts checker — runs in both dev and production
// Uses its own global guard to survive hot reloads
startScheduler();

export async function setupWebhook() {
  if (isLocalDev) {
    console.log('⚠️ Skipping webhook setup — local dev with polling');
    return;
  }
  const url = `${process.env.NEXTAUTH_URL}/api/webhook/telegram`;
  await bot.setWebHook(url, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
  console.log('✅ Telegram webhook set successfully at', url);
}

/**
 * Register a user who started the bot by saving their Telegram info to the database.
 * Includes profile photo, phone number (if available), chat ID, username, etc.
 */
async function registerTelegramUser(msg: TelegramBot.Message) {
  await dbConnect();

  const chat = msg.chat;
  const from = msg.from;
  if (!from) return;

  const chatId = chat.id.toString();

  // Attempt to fetch profile photo
  let profilePhotoUrl: string | undefined;
  try {
    const userPhotos = await bot.getUserProfilePhotos(from.id, { limit: 1 });
    if (userPhotos.total_count > 0) {
      const fileId = userPhotos.photos[0][0].file_id;
      const fileLink = await bot.getFileLink(fileId);
      profilePhotoUrl = fileLink;
    }
  } catch (err) {
    // Profile photo may not be available; continue without it
    console.log('Could not fetch profile photo for user', from.id);
  }

  // Build title from first/last name for private chats
  const title =
    chat.type === 'private'
      ? [chat.first_name, chat.last_name].filter(Boolean).join(' ') || 'Private Chat'
      : chat.title || 'Group';

  // Upsert the chat/user record with all available info
  await TelegramChat.findOneAndUpdate(
    { chatId },
    {
      chatId,
      title,
      type: chat.type,
      username: from.username || undefined,
      firstName: from.first_name || undefined,
      lastName: from.last_name || undefined,
      phone: (from as any).phone_number || undefined,
      profilePhoto: profilePhotoUrl || undefined,
      isBotUser: chat.type === 'private',
      lastMessageAt: new Date(),
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Registered user ${from.id} (${from.username || 'no username'})`);
}

// Handle /start command — send welcome message & register user
bot.onText(/\/start/, async (msg) => {
  console.log(`🚀 /start received from user ${msg.from?.id}`);
  await dbConnect();

  const chat = msg.chat;
  const from = msg.from;
  const chatId = chat.id.toString();

  // Register the user in the database
  await registerTelegramUser(msg);

  // Load custom welcome message from settings (fall back to default)
  const settings = await Settings.findOne({});
  let welcomeMessage = "";
  if (settings?.welcomeMessage) {
    welcomeMessage = settings.welcomeMessage.replace(/\$\{name\}/g, from?.first_name || 'User');
  }
  if (!welcomeMessage) {
    welcomeMessage = `👋 *Welcome to the Admin Panel Bot!*

Hello${from?.first_name ? ` ${from.first_name}` : ''}! You have been successfully registered.

Thank you for connecting! 🙏`;
  }

  try {
    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    console.log(`📨 Welcome message sent to ${chatId}`);
  } catch (err) {
    console.error('Failed to send welcome message:', err);
  }
});

// Save incoming message to MongoDB (for all messages, including after /start)
bot.on('message', async (msg) => {
  await dbConnect();

  const chat = msg.chat;
  const from = msg.from;

  // Register user if not already registered (handles any message before /start)
  if (chat.type === 'private' && from) {
    const existingChat = await TelegramChat.findOne({ chatId: chat.id.toString() });
    if (!existingChat) {
      await registerTelegramUser(msg);
    } else {
      // Update last message time and user details
      const updates: any = { lastMessageAt: new Date() };
      if (from.username) updates.username = from.username;
      if (from.first_name) updates.firstName = from.first_name;
      if (from.last_name) updates.lastName = from.last_name;
      if ((from as any).phone_number) updates.phone = (from as any).phone_number;

      await TelegramChat.findOneAndUpdate(
        { chatId: chat.id.toString() },
        { $set: updates }
      );
    }
  }

  // Determine media type and URL
  let mediaUrl: string | undefined;
  let mediaType: string | undefined;

  if (msg.photo) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    mediaUrl = largestPhoto.file_id;
    mediaType = 'photo';
  } else if (msg.video) {
    mediaUrl = msg.video.file_id;
    mediaType = 'video';
  } else if (msg.document) {
    mediaUrl = msg.document.file_id;
    mediaType = 'document';
  } else if (msg.audio) {
    mediaUrl = msg.audio.file_id;
    mediaType = 'audio';
  } else if (msg.voice) {
    mediaUrl = msg.voice.file_id;
    mediaType = 'voice';
  } else if (msg.animation) {
    mediaUrl = msg.animation.file_id;
    mediaType = 'animation';
  } else if (msg.sticker) {
    mediaUrl = msg.sticker.file_id;
    mediaType = 'sticker';
  }

  // Save message
  await TelegramMessage.create({
    messageId: msg.message_id,
    chatId: chat.id.toString(),
    fromId: from?.id.toString(),
    text: msg.text || msg.caption,
    mediaUrl,
    mediaType,
    timestamp: new Date(),
  });

  console.log(`📥 New message from chat ${chat.id}`);
});

export default bot;