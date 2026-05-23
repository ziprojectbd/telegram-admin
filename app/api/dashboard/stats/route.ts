import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";
import Post from "@/models/Post";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  // Total chats — count directly from TelegramChat collection
  const totalChats = await TelegramChat.countDocuments({});

  // Active chats — users who sent at least one real message (not just /start)
  const activeChatIds = await TelegramMessage.distinct("chatId", {
    text: { $not: /^\/start/ },
  });
  const activeChats = activeChatIds.length;

  // Total unread messages (user messages not yet read)
  const totalUnread = await TelegramMessage.countDocuments({
    fromId: { $ne: "admin" },
    read: false,
  });

  // Total published posts
  const totalPosts = await Post.countDocuments({ published: true });

  // Bot is always Online — the API itself proves the bot is running
  const botStatus = "Online";

  return NextResponse.json({
    totalChats,
    activeChats,
    totalUnread,
    totalPosts,
    botStatus,
    timestamp: new Date().toISOString(),
  });
}