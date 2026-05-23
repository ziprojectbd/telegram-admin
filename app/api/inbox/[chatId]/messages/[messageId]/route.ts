import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bot } from "@/lib/telegram";
import dbConnect from "@/lib/db";
import TelegramMessage from "@/models/TelegramMessage";
import mongoose from "mongoose";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string; messageId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await dbConnect();

    let deleted;

    // Strategy 1: Try deleting by numeric Telegram messageId
    const messageIdNum = parseInt(params.messageId, 10);
    if (!isNaN(messageIdNum)) {
      deleted = await TelegramMessage.findOneAndDelete({
        messageId: messageIdNum,
        chatId: params.chatId,
      });
    }

    // Strategy 2: Try deleting by MongoDB _id (only valid 24-char hex strings)
    if (!deleted && /^[0-9a-fA-F]{24}$/.test(params.messageId)) {
      deleted = await TelegramMessage.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(params.messageId),
        chatId: params.chatId,
      });
    }

    if (!deleted) {
      console.error("Delete failed — message not found for chat:", params.chatId, "msgId:", params.messageId);
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Also delete from Telegram bot conversation
    const telegramChatId = params.chatId;
    const telegramMessageId = deleted.messageId;

    if (telegramMessageId) {
      try {
        await bot.deleteMessage(telegramChatId, telegramMessageId);
        console.log(`✅ Deleted message ${telegramMessageId} from Telegram chat ${telegramChatId}`);
      } catch (telegramError: any) {
        // If Telegram returns 400 (message can't be deleted — e.g. too old), still okay
        // If it returns 403 (no rights), that's also non-critical for the admin panel
        console.warn(
          `⚠️ Could not delete from Telegram (chat: ${telegramChatId}, msg: ${telegramMessageId}):`,
          telegramError?.message || telegramError
        );
      }
    }

    return NextResponse.json({ success: true, deletedId: deleted._id.toString() });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}