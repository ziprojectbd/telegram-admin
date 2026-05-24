import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Settings from "@/models/Settings";
import User from "@/models/User";
import { reinitializeBot } from "@/lib/telegram";
import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  // Get the first non-empty settings document regardless of userId field
  // (migration-safe: works with both old per-user and new global schema)
  let settings = await Settings.findOne({}).sort({ createdAt: -1 }).lean();
  if (!settings || !Object.keys(settings).some(k => ['botToken','telegramChatId','adminEmail','adminPassword','mongodbUri','autoReplyEnabled','welcomeMessage'].includes(k) && (settings as any)[k])) {
    settings = null;
  }

  const data = {
    botToken: (settings as any)?.botToken || "",
    telegramChatId: (settings as any)?.telegramChatId || "",
    adminEmail: (settings as any)?.adminEmail || "",
    adminPassword: (settings as any)?.adminPassword || "",
    mongodbUri: (settings as any)?.mongodbUri || "",
    autoReplyEnabled: (settings as any)?.autoReplyEnabled ?? false,
    welcomeMessage: (settings as any)?.welcomeMessage || "",
    hasDbSettings: !!(settings as any)?._id,
  };

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const body = await req.json();
  const { botToken, telegramChatId, adminEmail, adminPassword, mongodbUri, autoReplyEnabled, welcomeMessage } = body;

  const updateData: Record<string, any> = {};

  if (botToken !== undefined && botToken !== "") updateData.botToken = botToken;
  if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;
  if (adminEmail !== undefined) updateData.adminEmail = adminEmail;
  if (adminPassword !== undefined && adminPassword !== "") updateData.adminPassword = adminPassword;
  if (mongodbUri !== undefined) updateData.mongodbUri = mongodbUri;
  if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
  if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;

  // Use a global settings document (only one per app)
  // Also clean up old per-user documents and remove userId field
  await Settings.deleteMany({ userId: { $exists: true } });
  await Settings.findOneAndUpdate(
    {},
    { $set: updateData, $unset: { userId: "" } },
    { upsert: true, new: true }
  ).lean();

  // If admin email/password changed — sync the User document for login
  if (adminEmail !== undefined && adminPassword !== undefined && adminPassword !== "") {
    await User.findOneAndUpdate(
      { email: adminEmail },
      {
        $set: {
          email: adminEmail,
          name: "Admin User",
          password: await bcryptjs.hash(adminPassword, 10),
        },
      },
      { upsert: true, new: true }
    ).lean();
  } else if (adminEmail !== undefined) {
    await User.findOneAndUpdate(
      { email: adminEmail },
      { $set: { email: adminEmail, name: "Admin User" } },
      { upsert: true }
    ).lean();
  }

  // If botToken changed — reinitialize the Telegram bot BEFORE any DB disconnect
  let botStatus = "";
  if (botToken !== undefined && botToken !== "" && mongodbUri === undefined) {
    try {
      const bot = await reinitializeBot();
      const botInfo = await bot.getMe();
      botStatus = `✅ Bot @${botInfo.username} connected successfully`;
      console.log(`🔄 Bot reinitialized: @${botInfo.username} (ID: ${botInfo.id})`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('404') || msg.includes('401')) {
        botStatus = "❌ Invalid bot token — check your token from @BotFather";
      } else {
        botStatus = `❌ Could not connect: ${msg}`;
      }
      console.error("Failed to reinitialize bot:", msg);
    }
  }

  // If mongodbUri changed — reconnect to the new database (do this AFTER bot reinit)
  let dbStatus = "";
  if (mongodbUri !== undefined && mongodbUri !== "") {
    try {
      await mongoose.disconnect();
      (globalThis as any).mongoose = { conn: null, promise: null };
      await dbConnect(mongodbUri);
      dbStatus = "✅ MongoDB reconnected successfully";
    } catch (err: any) {
      dbStatus = `❌ MongoDB connection failed: ${err?.message || err}`;
    }
  }

  return NextResponse.json({
    success: true,
    message: "Settings saved successfully.",
    botStatus,
    dbStatus,
  });
}