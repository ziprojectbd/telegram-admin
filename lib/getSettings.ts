import dbConnect from "./db";
import Settings from "@/models/Settings";
import { auth } from "./auth";

type SettingsData = {
  botToken: string;
  telegramChatId: string;
  adminEmail: string;
  adminPassword: string;
  autoReplyEnabled: boolean;
  welcomeMessage: string;
};

/**
 * Load settings for the current user.
 * All values are database-driven — no environment variable fallbacks.
 */
export async function getSettings(): Promise<SettingsData> {
  const session = await auth();
  const defaults: SettingsData = {
    botToken: "",
    telegramChatId: "",
    adminEmail: process.env.ADMIN_EMAIL || "",
    adminPassword: process.env.ADMIN_PASSWORD || "",
    autoReplyEnabled: false,
    welcomeMessage: "",
  };

  if (!session?.user?.id) return defaults;

  try {
    await dbConnect();
    const dbSettings = await Settings.findOne({ userId: session.user.id }).lean();
    if (!dbSettings) return defaults;

    return {
      botToken: (dbSettings as any)?.botToken || "",
      telegramChatId: (dbSettings as any)?.telegramChatId || "",
      adminEmail: (dbSettings as any)?.adminEmail || defaults.adminEmail,
      adminPassword: (dbSettings as any)?.adminPassword || defaults.adminPassword,
      autoReplyEnabled: (dbSettings as any)?.autoReplyEnabled ?? false,
      welcomeMessage: (dbSettings as any)?.welcomeMessage || "",
    };
  } catch {
    return defaults;
  }
}