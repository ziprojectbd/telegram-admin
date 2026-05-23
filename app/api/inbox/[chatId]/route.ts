import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await dbConnect();

    const chatId = params.chatId;

    // Delete all messages for this chat
    const msgResult = await TelegramMessage.deleteMany({ chatId });
    
    // Delete the chat record
    const chatResult = await TelegramChat.findOneAndDelete({ chatId });

    console.log(`🗑️ Deleted chat ${chatId}: ${msgResult.deletedCount} messages, chat record: ${chatResult ? "yes" : "no"}`);

    return NextResponse.json({
      success: true,
      deletedMessages: msgResult.deletedCount,
      deletedChat: !!chatResult,
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}