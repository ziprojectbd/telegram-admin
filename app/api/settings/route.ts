import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Settings from "@/models/Settings";
import { reinitializeBot } from "@/lib/telegram";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  let settings = await Settings.findOne({ userId: session.user.id }).lean();

  const data = {
    botToken: (settings as any)?.botToken || "",
    telegramChatId: (settings as any)?.telegramChatId || "",
    adminEmail: (settings as any)?.adminEmail || process.env.ADMIN_EMAIL || "",
    adminPassword: (settings as any)?.adminPassword || process.env.ADMIN_PASSWORD || "",
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
  const { botToken, telegramChatId, adminEmail, adminPassword, autoReplyEnabled, welcomeMessage } = body;

  const updateData: Record<string, any> = {};

  if (botToken !== undefined && botToken !== "") updateData.botToken = botToken;
  if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;
  if (adminEmail !== undefined) updateData.adminEmail = adminEmail;
  if (adminPassword !== undefined && adminPassword !== "") updateData.adminPassword = adminPassword;
  if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
  if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;

  await Settings.findOneAndUpdate(
    { userId: session.user.id },
    { $set: updateData },
    { upsert: true, new: true }
  ).lean();

  // If botToken changed — reinitialize the Telegram bot with the new token
  if (botToken !== undefined && botToken !== "") {
    try {
      await reinitializeBot();
      console.log("🔄 Bot reinitialized with new token from settings");
    } catch (err) {
      console.error("Failed to reinitialize bot with new token:", err);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Settings saved successfully.",
  });
}