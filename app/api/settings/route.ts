import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Settings from "@/models/Settings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  let settings = await Settings.findOne({ userId: session.user.id }).lean();

  const data = {
    botToken: (settings as any)?.botToken || process.env.TELEGRAM_BOT_TOKEN || "",
    telegramChatId: (settings as any)?.telegramChatId || process.env.TELEGRAM_CHAT_ID || "",
    webhookSecret: (settings as any)?.webhookSecret || process.env.TELEGRAM_WEBHOOK_SECRET || "",
    demoEmail: (settings as any)?.demoEmail || process.env.DEMO_EMAIL || "",
    demoPassword: (settings as any)?.demoPassword || process.env.DEMO_PASSWORD || "",
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
  const { botToken, telegramChatId, webhookSecret, demoEmail, demoPassword, autoReplyEnabled, welcomeMessage } = body;

  const updateData: Record<string, any> = {};

  if (botToken !== undefined && botToken !== "") updateData.botToken = botToken;
  if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;
  if (webhookSecret !== undefined && webhookSecret !== "") updateData.webhookSecret = webhookSecret;
  if (demoEmail !== undefined) updateData.demoEmail = demoEmail;
  if (demoPassword !== undefined && demoPassword !== "") updateData.demoPassword = demoPassword;
  if (autoReplyEnabled !== undefined) updateData.autoReplyEnabled = autoReplyEnabled;
  if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;

  await Settings.findOneAndUpdate(
    { userId: session.user.id },
    { $set: updateData },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    success: true,
    message: "Settings saved successfully.",
  });
}