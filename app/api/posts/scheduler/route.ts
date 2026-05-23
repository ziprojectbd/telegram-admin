import { NextResponse } from "next/server";
import { bot, getTelegramChatId } from "@/lib/telegram";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";

export const maxDuration = 60; // allow up to 60s for this function
export const dynamic = "force-dynamic"; // don't cache

export async function GET(req: Request) {
  // Simple auth check via query param secret
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const now = new Date();
  const duePosts = await Post.find({
    published: false,
    scheduledAt: { $lte: now },
  });

  let published = 0;
  let errors = 0;

  for (const post of duePosts) {
    try {
      const chatId = await getTelegramChatId();
      if (!chatId) {
        console.error("No Telegram chat ID configured. Set it in Settings page.");
        errors++;
        continue;
      }

      let sentMessage;

      if (post.mediaUrl && post.mediaType === "image") {
        sentMessage = await bot.sendPhoto(chatId, post.mediaUrl, {
          caption: `${post.title}\n\n${post.content}`,
        });
      } else {
        sentMessage = await bot.sendMessage(chatId, `${post.title}\n\n${post.content}`);
        if (post.mediaUrl) {
          try {
            await bot.sendPhoto(chatId, post.mediaUrl);
          } catch (photoErr) {
            console.log("Failed to send photo alongside message:", photoErr);
          }
        }
      }

      // Update post as published with Telegram IDs
      post.published = true;
      post.publishedAt = new Date();
      if (sentMessage) {
        post.telegramChatId = sentMessage.chat.id.toString();
        post.telegramMessageId = sentMessage.message_id;
      }
      await post.save();
      published++;
      console.log(`📅✅ Scheduled post "${post.title}" published to Telegram`);
    } catch (err: any) {
      console.error(`📅❌ Failed to publish scheduled post "${post.title}":`, err?.message || err);
      errors++;
    }
  }

  return NextResponse.json({
    success: true,
    checked: duePosts.length,
    published,
    errors,
    timestamp: now.toISOString(),
  });
}