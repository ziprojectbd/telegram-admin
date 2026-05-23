import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramMessage from "@/models/TelegramMessage";

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  // Mark all unread incoming messages as read
  await TelegramMessage.updateMany(
    {
      chatId: params.chatId,
      fromId: { $ne: "admin" },
      read: false,
    },
    { $set: { read: true } }
  );

  return NextResponse.json({ success: true });
}