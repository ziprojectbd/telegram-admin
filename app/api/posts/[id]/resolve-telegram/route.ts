import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { bot, getTelegramChatId } from "@/lib/telegram";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user!.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const post = await Post.findOne({ _id: params.id, userId: user._id });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.telegramMessageId) {
    return NextResponse.json({
      success: true,
      telegramChatId: post.telegramChatId,
      telegramMessageId: post.telegramMessageId,
      message: "Telegram message ID already stored",
    });
  }

  const chatId = await getTelegramChatId();
  if (!chatId) {
    return NextResponse.json({ error: "Telegram not configured. Set Chat ID in Settings page." }, { status: 400 });
  }

  try {
    // Fetch recent updates from the channel to find the matching message
    const updates = await bot.getUpdates({ timeout: 0, allowed_updates: ["channel_post", "message"] });
    
    let foundMessageId: number | null = null;
    let foundChatId: string | null = null;

    // Search through updates for a message matching this post's title
    for (const update of updates) {
      const msg = update.channel_post || update.message;
      if (!msg) continue;

      const msgChatId = msg.chat?.id?.toString();
      const msgText = msg.text || msg.caption || "";

      // Match by post title (or content if no title match)
      if (msgChatId && msgText.includes(post.title || post.content?.slice(0, 50))) {
        foundMessageId = msg.message_id;
        foundChatId = msgChatId;
        break;
      }
    }

    if (!foundMessageId) {
      return NextResponse.json({
        error: "Could not find matching message in Telegram. Make sure the bot is an admin of the channel.",
        found: false,
      }, { status: 404 });
    }

    // Store the resolved IDs
    post.telegramChatId = foundChatId;
    post.telegramMessageId = foundMessageId;
    await post.save();

    console.log(`✅ Resolved Telegram message ID for post ${post._id}: chat=${foundChatId}, msg=${foundMessageId}`);

    return NextResponse.json({
      success: true,
      telegramChatId: foundChatId,
      telegramMessageId: foundMessageId,
      message: "Telegram message ID resolved and stored",
    });
  } catch (err: any) {
    console.error("Resolve Telegram ID error:", err?.message || err);
    return NextResponse.json({ error: "Failed to resolve Telegram message ID" }, { status: 500 });
  }
}