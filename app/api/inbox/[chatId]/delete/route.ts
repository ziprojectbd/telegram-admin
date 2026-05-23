import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";

export async function DELETE(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  // Delete all messages for this chat
  await TelegramMessage.deleteMany({ chatId: params.chatId });

  // Delete the chat document
  await TelegramChat.deleteOne({ chatId: params.chatId });

  return NextResponse.json({ success: true });
}