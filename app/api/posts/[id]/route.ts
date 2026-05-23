import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { bot, getTelegramChatId } from "@/lib/telegram";

async function deleteFromTelegram(chatId: string, messageId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await bot.deleteMessage(chatId, messageId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || err?.description || "Delete failed" };
  }
}

async function findAndDeleteChannelPost(title: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Get chat ID from database settings (fallback to env)
    const channelUsername = await getTelegramChatId();
    if (!channelUsername) {
      return { ok: false, error: "No Telegram chat ID configured. Set it in Settings page." };
    }

    // Resolve to numeric ID via bot instance
    let chatId: string = channelUsername;
    if (channelUsername.startsWith("@")) {
      try {
        const chat = await bot.getChat(channelUsername);
        chatId = chat.id.toString();
        console.log(`📡 Resolved ${channelUsername} → numeric ID: ${chatId}`);
      } catch (err: any) {
        console.warn(`getChat failed for ${channelUsername}:`, err?.message);
      }
    }

    // Try getUpdates to find matching message
    try {
      const updates = await bot.getUpdates({ timeout: 0 });
      for (const update of updates) {
        const msg = update.channel_post || update.message;
        if (!msg) continue;

        const msgText = msg.text || msg.caption || "";
        const msgChatId = msg.chat?.id?.toString();

        // Match by title
        const titleMatch = title?.slice(0, 30);
        if (msgText.includes(titleMatch)) {
          const targetChatId = msgChatId || chatId;
          console.log(`🔍 Found matching message: chat=${targetChatId}, msg=${msg.message_id}, text="${msgText.slice(0, 40)}..."`);

          try {
            await bot.deleteMessage(targetChatId!, msg.message_id);
            console.log(`✅ Deleted from Telegram: chat=${targetChatId}, msg=${msg.message_id}`);
            return { ok: true };
          } catch (deleteErr: any) {
            return { ok: false, error: deleteErr?.message };
          }
        }
      }
    } catch (err: any) {
      console.warn("getUpdates failed:", err?.message);
    }

    // Message not found in recent updates
    console.log(`⚠️ Post "${title}" not found in recent updates. The message may be too old.`);
    return { ok: false, error: "Message not found in recent updates. For old posts, re-publish first to get a new message ID, then delete." };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user!.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, content, mediaUrl, mediaType, scheduledAt, published } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
  if (mediaType !== undefined) updateData.mediaType = mediaType;
  if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  if (published !== undefined) updateData.published = published;

  const post = await Post.findOneAndUpdate(
    { _id: params.id, userId: user._id },
    { $set: updateData },
    { new: true }
  );

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, post });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user!.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const post = await Post.findOneAndDelete({ _id: params.id, userId: user._id });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  console.log(`📋 Post "${post.title}" deleted from DB`);

  let telegramDeleted = false;
  let telegramError: string | undefined;

  // Method 1: Use stored Telegram message ID (for posts published after the fix)
  if (post.telegramChatId && post.telegramMessageId) {
    const result = await deleteFromTelegram(post.telegramChatId, post.telegramMessageId);
    if (result.ok) {
      telegramDeleted = true;
      console.log(`✅ Deleted from Telegram using stored message ID`);
    } else {
      telegramError = result.error;
      console.warn(`⚠️ Stored IDs failed: ${result.error}`);
    }
  }

  // Method 2: Search for the message in Telegram updates and delete it
  if (!telegramDeleted) {
    console.log(`🔍 Searching Telegram channel for post "${post.title}"...`);
    const result = await findAndDeleteChannelPost(post.title);
    if (result.ok) {
      telegramDeleted = true;
    } else {
      telegramError = result.error;
      console.warn(`⚠️ Telegram search & delete failed: ${result.error}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Post deleted from database${telegramDeleted ? " and Telegram channel" : `. Telegram: ${telegramError || "no action taken"}`}`,
    telegramDeleted,
    telegramError,
  });
}