import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  
  const chats = await TelegramChat.find({}).sort({ lastMessageAt: -1 }).lean();
  
  // Enrich each chat with the latest message preview and unread count
  const enriched = await Promise.all(
    chats.map(async (chat: any) => {
      // Get last message preview
      const lastMsg: any = await TelegramMessage.findOne({ chatId: chat.chatId })
        .sort({ timestamp: -1 })
        .select("text mediaType timestamp fromId")
        .lean();

      // Count unread messages (incoming from users, exclude /start commands and admin replies)
      const unreadCount = await TelegramMessage.countDocuments({
        chatId: chat.chatId,
        fromId: { $ne: "admin" },
        text: { $not: /^\/start/ },
      });

      let lastMessagePreview = "";
      if (lastMsg) {
        if (lastMsg.text) {
          lastMessagePreview = lastMsg.text;
        } else if (lastMsg.mediaType) {
          const mediaIcons: Record<string, string> = {
            photo: "📷 Photo",
            video: "🎥 Video",
            document: "📄 Document",
            audio: "🎵 Audio",
            voice: "🎤 Voice",
            sticker: "🏷️ Sticker",
            animation: "🎞️ GIF",
          };
          lastMessagePreview = mediaIcons[lastMsg.mediaType] || "📎 Media";
        }
        if (lastMessagePreview.length > 60) {
          lastMessagePreview = lastMessagePreview.slice(0, 60) + "...";
        }

        const msgDate = new Date(lastMsg.timestamp);
        const now = new Date();
        const isToday = msgDate.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = msgDate.toDateString() === yesterday.toDateString();

        let timeStr: string;
        if (isToday) {
          timeStr = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (isYesterday) {
          timeStr = "Yesterday";
        } else {
          timeStr = msgDate.toLocaleDateString([], { weekday: "short" });
        }
        chat.lastMessageTime = timeStr;
        chat.lastMessagePreview = lastMessagePreview;
      } else {
        chat.lastMessageTime = "";
        chat.lastMessagePreview = "No messages yet";
      }

      chat.unreadCount = unreadCount;

      return chat;
    })
  );

  return NextResponse.json(enriched);
}