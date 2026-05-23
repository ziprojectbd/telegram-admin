import TelegramBot from 'node-telegram-bot-api';
import dbConnect from './db';
import TelegramChat from '@/models/TelegramChat';
import TelegramMessage from '@/models/TelegramMessage';
import { startScheduler } from './scheduler';
import Settings from '@/models/Settings';

// We store the bot instance + its associated data globally
// so it survives Next.js hot reloads
let botInstance: TelegramBot | null = null;
let currentTokenHash: string | null = null;
let pollingStarted = false;

/**
 * Hash a string for comparison (simple, not crypto-secure — just for change detection)
 */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

/**
 * Remove all existing bot event listeners so we can re-attach them
 * after re-creating the bot with a new token.
 */
function removeAllListeners() {
  if (botInstance) {
    botInstance.removeAllListeners('message');
    botInstance.removeTextListener(/\/start/);
  }
}

/**
 * Attach the core event listeners to the bot instance.
 * These are the /start command handler and the message handler.
 */
function attachEventListeners() {
  if (!botInstance) return;

  // Handle /start command — send welcome message & register user
  botInstance.onText(/\/start/, async (msg) => {
    console.log(`🚀 /start received from user ${msg.from?.id}`);
    await dbConnect();

    const chat = msg.chat;
    const from = msg.from;
    const chatId = chat.id.toString();

    // Check if user is blocked before proceeding
    const existingChat = await TelegramChat.findOne({ chatId }).lean();
    if (existingChat && (existingChat as any).blocked) {
      console.log(`🚫 Blocked user ${from?.id} tried /start — ignored`);
      return;
    }

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
      await botInstance!.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
      console.log(`📨 Welcome message sent to ${chatId}`);
    } catch (err) {
      console.error('Failed to send welcome message:', err);
    }
  });

  // Save incoming message to MongoDB (for all messages, including after /start)
  botInstance.on('message', async (msg) => {
    await dbConnect();

    const chat = msg.chat;
    const from = msg.from;

    // Check if user is blocked — reject messages from blocked users
    if (chat.type === 'private') {
      const existingChat = await TelegramChat.findOne({ chatId: chat.id.toString() }).lean();
      if (existingChat && (existingChat as any).blocked) {
        console.log(`🚫 Blocked message from chat ${chat.id} — ignored`);
        return;
      }
    }

    // Register user if not already registered (handles any message before /start)
    if (chat.type === 'private' && from) {
      const existingChat = await TelegramChat.findOne({ chatId: chat.id.toString() });
      if (!existingChat) {
        await registerTelegramUser(msg);
      } else {
        // Update last message time and user details — NEVER touch the "blocked" field
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
    try {
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
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  });
}

/**
 * Register a user who started the bot by saving their Telegram info to the database.
 * Includes profile photo, phone number (if available), chat ID, username, etc.
 * Preserves the existing "blocked" field — never resets it.
 */
async function registerTelegramUser(msg: TelegramBot.Message) {
  await dbConnect();

  const chat = msg.chat;
  const from = msg.from;
  if (!from) return;

  const chatId = chat.id.toString();

  // First, check if the chat already exists and preserve its blocked status
  const existingChat = await TelegramChat.findOne({ chatId }).lean();
  const currentBlockedStatus = existingChat ? (existingChat as any).blocked : undefined;

  // Attempt to fetch profile photo
  let profilePhotoUrl: string | undefined;
  try {
    const userPhotos = await botInstance!.getUserProfilePhotos(from.id, { limit: 1 });
    if (userPhotos.total_count > 0) {
      const fileId = userPhotos.photos[0][0].file_id;
      const fileLink = await botInstance!.getFileLink(fileId);
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

  // Build $set object — explicitly include blocked to preserve current value
  const setFields: Record<string, any> = {
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
  };

  // IMPORTANT: Always preserve the existing blocked status.
  // If the document exists, carry over its current blocked value.
  // If it doesn't exist, default to false.
  if (existingChat) {
    setFields.blocked = currentBlockedStatus === true;
  } else {
    setFields.blocked = false;
  }

  await TelegramChat.findOneAndUpdate(
    { chatId },
    { $set: setFields },
    { upsert: true, new: true }
  );

  console.log(`✅ Registered user ${from.id} (${from.username || 'no username'})`);
}

/**
 * Stop current bot polling if it's running.
 */
async function stopPolling() {
  if (botInstance && pollingStarted) {
    try {
      await botInstance.stopPolling();
      console.log('⏹️  Bot polling stopped');
    } catch (err) {
      console.error('Error stopping polling:', err);
    }
    pollingStarted = false;
  }
}

/**
 * Start polling on the current bot instance (only once).
 * Guarded to prevent multiple polling instances.
 */
function startPollingIfNeeded() {
  if (!botInstance || pollingStarted) return;

  const isLocalDev =
    process.env.NEXTAUTH_URL?.includes('localhost') ||
    process.env.NEXTAUTH_URL?.includes('127.0.0.1');

  if (isLocalDev) {
    botInstance.startPolling().catch((err) => {
      console.error('Failed to start polling:', err);
    });
    pollingStarted = true;
    console.log('✅ Telegram bot polling started (single instance)');
  }
}

/**
 * Get or create the bot instance.
 * Reads bot token from the Settings database ONLY.
 * No environment variable fallback — all config is database-driven.
 * 
 * IMPORTANT: This function creates the bot WITHOUT starting polling.
 * Polling is only started by the dedicated startBotPolling() function
 * to prevent multiple polling instances (409 Conflict errors).
 */
export async function getBot(): Promise<TelegramBot> {
  await dbConnect();

  // Get token from database settings (MANDATORY — no env fallback)
  let token: string | undefined;
  try {
    const settings = await Settings.findOne({}).lean();
    const dbToken = (settings as any)?.botToken;
    if (dbToken && typeof dbToken === 'string' && dbToken.trim()) {
      token = dbToken.trim();
    }
  } catch (err) {
    console.error('Failed to read bot token from settings DB:', err);
  }

  if (!token) {
    throw new Error(
      'No Telegram bot token found. Please set it in the Settings page.'
    );
  }

  const tokenH = hash(token);

  // If the token changed, recreate the bot
  if (botInstance && currentTokenHash !== tokenH) {
    console.log('🔄 Bot token changed — reinitializing bot...');
    await stopPolling();
    removeAllListeners();
    botInstance = null;
    currentTokenHash = null;
  }

  // Create bot if not exists (NO polling — polling is started separately)
  if (!botInstance) {
    botInstance = new TelegramBot(token, { polling: false });
    currentTokenHash = tokenH;
    attachEventListeners();
    console.log('🤖 Telegram bot initialized (DB-driven token, no polling yet)');
  }

  return botInstance;
}

/**
 * Start the Telegram bot's polling for incoming updates.
 * This should be called EXACTLY ONCE from app initialization (layout.tsx).
 * API routes should use getBot() which does NOT start polling.
 */
export async function startBotPolling(): Promise<void> {
  await getBot(); // Ensure bot instance exists
  startPollingIfNeeded();
}

/**
 * Get the Telegram chat ID from database settings ONLY.
 * No environment variable fallback — all config is database-driven.
 */
export async function getTelegramChatId(): Promise<string | null> {
  await dbConnect();
  try {
    const settings = await Settings.findOne({}).lean();
    const dbChatId = (settings as any)?.telegramChatId;
    if (dbChatId && typeof dbChatId === 'string' && dbChatId.trim()) {
      return dbChatId.trim();
    }
  } catch (err) {
    console.error('Failed to read chat ID from settings DB:', err);
  }
  return null;
}

/**
 * Force reinitialize the bot with the latest token from DB.
 * Called after settings are updated.
 */
export async function reinitializeBot(): Promise<TelegramBot> {
  await dbConnect();
  await stopPolling();
  removeAllListeners();
  botInstance = null;
  currentTokenHash = null;
  pollingStarted = false;
  // Re-create the bot AND restart polling (since this is an explicit admin action)
  const bot = await getBot();
  startPollingIfNeeded();
  return bot;
}

// ============================
// Setup webhook (for production)
// ============================
export async function setupWebhook() {
  const isLocalDev =
    process.env.NEXTAUTH_URL?.includes('localhost') ||
    process.env.NEXTAUTH_URL?.includes('127.0.0.1');

  if (isLocalDev) {
    console.log('⚠️ Skipping webhook setup — local dev with polling');
    return;
  }
  const bot = await getBot();
  const url = `${process.env.NEXTAUTH_URL}/api/webhook/telegram`;
  await bot.setWebHook(url, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
  console.log('✅ Telegram webhook set successfully at', url);
}

// ============================
// Backward-compatible export: `bot` as a lazy getter proxy
// Any code that does `import { bot } from "@/lib/telegram"` will still work,
// but the underlying bot instance is fetched from DB lazily.
// ============================
export const bot = new Proxy({} as TelegramBot, {
  get(_target, prop: keyof TelegramBot) {
    // Return a function that first awaits getBot(), then calls the method
    return (...args: any[]) => {
      return getBot().then((b) => {
        const method = b[prop] as any;
        if (typeof method === 'function') {
          return method.apply(b, args);
        }
        return method;
      });
    };
  },
});