import TelegramBot from 'node-telegram-bot-api';
import dbConnect from './db';
import TelegramChat from '@/models/TelegramChat';
import TelegramMessage from '@/models/TelegramMessage';
import { startScheduler } from './scheduler';
import Settings from '@/models/Settings';

// ─── Singleton bot instance persisted on globalThis ───
const G = globalThis as any;
let botInstance: TelegramBot | null = G.__tgBotInstance ?? null;
let currentTokenHash: string | null = G.__tgCurrentTokenHash ?? null;
let listenersAttached = false;

function setBotInstance(bot: TelegramBot | null, hash: string | null) {
  botInstance = bot;
  currentTokenHash = hash;
  G.__tgBotInstance = bot;
  G.__tgCurrentTokenHash = hash;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

// ─── Event listeners ───
// Attached ONCE when the bot singleton is created.
// All updates flow through processUpdate() in the webhook route.

function attachEventListeners() {
  if (!botInstance || listenersAttached) return;

  botInstance.onText(/\/start/, async (msg) => {
    console.log(`🚀 /start received from user ${msg.from?.id}`);
    await dbConnect();
    const chat = msg.chat;
    const chatId = chat.id.toString();

    const existingChat = await TelegramChat.findOne({ chatId }).lean();
    if (existingChat && (existingChat as any).blocked) {
      console.log(`🚫 Blocked user ${msg.from?.id} tried /start — ignored`);
      return;
    }

    await registerTelegramUser(msg);

    const settings = await Settings.findOne({});
    let welcome = '';
    if (settings?.welcomeMessage) {
      welcome = settings.welcomeMessage.replace(/\$\{name\}/g, msg.from?.first_name || 'User');
    }
    if (!welcome) {
      welcome =
        `👋 *Welcome to the Admin Panel Bot!*\n\n` +
        `Hello${msg.from?.first_name ? ` ${msg.from.first_name}` : ''}! ` +
        `You have been successfully registered.\n\n` +
        `Thank you for connecting! 🙏`;
    }
    try {
      await botInstance!.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
      console.log(`📨 Welcome message sent to ${chatId}`);
    } catch (err) {
      console.error('Failed to send welcome message:', err);
    }
  });

  botInstance.on('message', async (msg) => {
    await dbConnect();
    const chat = msg.chat;
    const from = msg.from;

    if (chat.type === 'private') {
      const existingChat = await TelegramChat.findOne({ chatId: chat.id.toString() }).lean();
      if (existingChat && (existingChat as any).blocked) {
        console.log(`🚫 Blocked message from chat ${chat.id} — ignored`);
        return;
      }
    }

    if (chat.type === 'private' && from) {
      const existingChat = await TelegramChat.findOne({ chatId: chat.id.toString() });
      if (!existingChat) {
        await registerTelegramUser(msg);
      } else {
        const u: any = { lastMessageAt: new Date() };
        if (from.username) u.username = from.username;
        if (from.first_name) u.firstName = from.first_name;
        if (from.last_name) u.lastName = from.last_name;
        if ((from as any).phone_number) u.phone = (from as any).phone_number;
        await TelegramChat.findOneAndUpdate({ chatId: chat.id.toString() }, { $set: u });
      }
    }

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (msg.photo) {
      mediaUrl = msg.photo[msg.photo.length - 1].file_id;
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

  listenersAttached = true;
}

async function registerTelegramUser(msg: TelegramBot.Message) {
  await dbConnect();
  const chat = msg.chat;
  const from = msg.from;
  if (!from) return;
  const chatId = chat.id.toString();

  const existingChat = await TelegramChat.findOne({ chatId }).lean();
  const blocked = existingChat ? (existingChat as any).blocked : undefined;

  let photo: string | undefined;
  try {
    const photos = await botInstance!.getUserProfilePhotos(from.id, { limit: 1 });
    if (photos.total_count > 0) {
      photo = await botInstance!.getFileLink(photos.photos[0][0].file_id);
    }
  } catch {
    /* ok */
  }

  const title =
    chat.type === 'private'
      ? [chat.first_name, chat.last_name].filter(Boolean).join(' ') || 'Private Chat'
      : chat.title || 'Group';

  const fields: any = {
    chatId,
    title,
    type: chat.type,
    username: from.username || undefined,
    firstName: from.first_name || undefined,
    lastName: from.last_name || undefined,
    phone: (from as any).phone_number || undefined,
    profilePhoto: photo || undefined,
    isBotUser: chat.type === 'private',
    lastMessageAt: new Date(),
    blocked: existingChat ? !!blocked : false,
  };

  await TelegramChat.findOneAndUpdate({ chatId }, { $set: fields }, { upsert: true, new: true });
  console.log(`✅ Registered user ${from.id}`);
}

// ─── Public API ───

/**
 * Get or create the singleton bot instance.
 * Reads token from Settings database ONLY (no env fallback).
 * Bot is created WITHOUT polling — all updates come via webhook.
 */
export async function getBot(): Promise<TelegramBot> {
  await dbConnect();
  let token: string | undefined;
  try {
    const settings = await Settings.findOne({}).lean();
    const t = (settings as any)?.botToken;
    if (t && typeof t === 'string' && t.trim()) token = t.trim();
  } catch (err) {
    console.error('Failed to read bot token from DB:', err);
  }
  if (!token) {
    throw new Error('No Telegram bot token found. Set it in Settings.');
  }

  const tokenH = hash(token);
  // If token changed, recreate the bot with new token
  if (botInstance && currentTokenHash !== tokenH) {
    console.log('🔄 Token changed — recreating bot instance');
    await stopPolling();
    removeAllListeners();
    setBotInstance(null, null);
    listenersAttached = false;
  }

  if (!botInstance) {
    const newBot = new TelegramBot(token, { polling: false, webHook: false });
    setBotInstance(newBot, tokenH);
    attachEventListeners();
    console.log('🤖 Telegram bot initialized');
  }

  return botInstance!;
}

function removeAllListeners() {
  if (!botInstance) return;
  botInstance.removeAllListeners('message');
  botInstance.removeTextListener(/\/start/);
}

/**
 * Start polling for updates — fallback for localhost where HTTPS webhook is unavailable.
 * Uses a globalThis guard to prevent duplicate polling.
 */
async function startPolling(bot: TelegramBot) {
  if (G.__tgPollingStarted) return;
  G.__tgPollingStarted = true;

  // Delete any existing webhook to ensure polling works
  try {
    await bot.deleteWebHook();
  } catch {
    // ignore
  }

  await bot.startPolling({ restart: true });
  bot.on('polling_error', (err: any) => {
    // Telegram's 409 conflict errors are normal and harmless in polling mode
    if (err?.code === 'EFATAL' || err?.statusCode === 409) return;
    console.error('⚠️ Polling error:', err?.message || err);
  });
  console.log('🔄 Telegram bot started in polling mode');
}

/**
 * Stop polling. Called when recreating the bot (token change).
 */
async function stopPolling() {
  if (!botInstance || !G.__tgPollingStarted) return;
  try {
    await botInstance.stopPolling();
  } catch {
    // ignore
  }
  G.__tgPollingStarted = false;
}

/**
 * Configure the Telegram webhook.
 * Call this ONCE at app startup (from layout.tsx).
 * Safe to call multiple times — uses a globalThis guard.
 */
export async function setupWebhook() {
  if (G.__tgWebhookSet) return;
  G.__tgWebhookSet = true;

  const bot = await getBot();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    console.warn('⚠️ NEXTAUTH_URL not set — falling back to polling mode.');
    await startPolling(bot);
    return;
  }

  // Telegram requires HTTPS — skip webhook on localhost, use polling instead
  if (!baseUrl.startsWith('https://')) {
    console.warn('⚠️ Webhook SKIPPED (HTTPS required). Falling back to polling mode for local dev.');
    await startPolling(bot);
    return;
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/webhook/telegram`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const opts: any = {};
    if (secret) opts.secret_token = secret;
    await bot.setWebHook(url, opts);
    console.log(`✅ Webhook set to ${url}`);
  } catch (err) {
    console.error('❌ Failed to set webhook:', err);
    G.__tgWebhookSet = false;
  }
}

/**
 * Get the Telegram chat ID from database settings ONLY.
 */
export async function getTelegramChatId(): Promise<string | null> {
  await dbConnect();
  try {
    const s = await Settings.findOne({}).lean();
    const id = (s as any)?.telegramChatId;
    if (id && typeof id === 'string' && id.trim()) return id.trim();
  } catch (err) {
    console.error('Failed to read chat ID from DB:', err);
  }
  return null;
}

/**
 * Force reinitialize the bot with the latest token from DB.
 * Called after settings are updated.
 * Re-creates the bot instance and resets the webhook.
 */
export async function reinitializeBot(): Promise<TelegramBot> {
  await dbConnect();
  await stopPolling();
  removeAllListeners();
  setBotInstance(null, null);
  listenersAttached = false;
  G.__tgWebhookSet = false; // Allow webhook to be re-set

  const bot = await getBot();
  // Re-set webhook with new token
  await setupWebhook();
  return bot;
}

// ─── Backward-compatible proxy ───
// Any code doing `import { bot } from "@/lib/telegram"` still works.
export const bot = new Proxy({} as TelegramBot, {
  get(_target, prop: keyof TelegramBot) {
    return (...args: any[]) =>
      getBot().then((b) => {
        const method = b[prop] as any;
        return typeof method === 'function' ? method.apply(b, args) : method;
      });
  },
});