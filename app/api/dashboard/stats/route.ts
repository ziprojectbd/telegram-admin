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

  // Total chats with at least one real message (exclude /start only)
  const chatIds = await TelegramMessage.distinct("chatId", {
    text: { $not: /^\/start/ },
  });
  const totalChats = chatIds.length;

  // Total unread messages (user messages excluding /start)
  const totalUnread = await TelegramMessage.countDocuments({
    fromId: { $ne: "admin" },
    text: { $not: /^\/start/ },
  });

  // Total published posts
  const totalPosts = await Post.countDocuments({ published: true });

  // Bot status — check if any message received recently (within 2 min)
  const lastMsg = await TelegramMessage.findOne().sort({ timestamp: -1 }).lean();
  let botStatus: string;
  if (lastMsg) {
    const elapsed = Date.now() - new Date((lastMsg as any).timestamp).getTime();
    botStatus = elapsed < 120000 ? "Online" : "Idle";
  } else {
    botStatus = "Online";
  }

  return NextResponse.json({
    totalChats,
    totalUnread,
    totalPosts,
    botStatus,
    timestamp: new Date().toISOString(),
  });
}