import dbConnect from "./db";
import Settings from "@/models/Settings";
import { auth } from "./auth";

type SettingsData = {
  botToken: string;
  telegramChatId: string;
  webhookSecret: string;
  demoEmail: string;
  demoPassword: string;
  autoReplyEnabled: boolean;
  welcomeMessage: string;
};

/**
 * Load settings for the current user.
 * Falls back to environment variables if DB value is empty.
 */
export async function getSettings(): Promise<SettingsData> {
  const session = await auth();
  const defaults: SettingsData = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
    demoEmail: process.env.DEMO_EMAIL || "",
    demoPassword: process.env.DEMO_PASSWORD || "",
    autoReplyEnabled: false,
    welcomeMessage: "",
  };

  if (!session?.user?.id) return defaults;

  try {
    await dbConnect();
    const dbSettings = await Settings.findOne({ userId: session.user.id }).lean();
    if (!dbSettings) return defaults;

    return {
      botToken: (dbSettings as any).botToken || defaults.botToken,
      telegramChatId: (dbSettings as any).telegramChatId || defaults.telegramChatId,
      webhookSecret: (dbSettings as any).webhookSecret || defaults.webhookSecret,
      demoEmail: (dbSettings as any).demoEmail || defaults.demoEmail,
      demoPassword: (dbSettings as any).demoPassword || defaults.demoPassword,
      autoReplyEnabled: (dbSettings as any).autoReplyEnabled ?? false,
      welcomeMessage: (dbSettings as any).welcomeMessage || "",
    };
  } catch {
    return defaults;
  }
}