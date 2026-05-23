import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bot, getTelegramChatId } from "@/lib/telegram";
import dbConnect from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, content, mediaUrl, mediaType, scheduledAt } = body;

  // Look up the user from DB to get a valid ObjectId
  const user = await User.findOne({ email: session.user!.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 400 });
  }

  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isScheduled = scheduleDate && scheduleDate > new Date();

  let post;

  if (isScheduled) {
    // Save as draft — publish later via cron
    post = await Post.create({
      title,
      content,
      mediaUrl,
      mediaType,
      scheduledAt: scheduleDate,
      published: false,
      publishedAt: null,
      userId: user._id,
    });

    console.log(`📅 Post "${title}" scheduled for ${scheduleDate.toISOString()}`);
  } else {
    // Publish immediately
    post = await Post.create({
      title,
      content,
      mediaUrl,
      mediaType,
      scheduledAt: null,
      published: true,
      publishedAt: new Date(),
      userId: user._id,
    });

    // Send to Telegram immediately
    try {
      const chatId = await getTelegramChatId();
      if (chatId) {
        let sentMessage;

        if (mediaUrl && mediaType === "image") {
          sentMessage = await bot.sendPhoto(chatId, mediaUrl, {
            caption: `${title}\n\n${content}`,
          });
        } else {
          sentMessage = await bot.sendMessage(chatId, `${title}\n\n${content}`);
          if (mediaUrl) {
            try {
              await bot.sendPhoto(chatId, mediaUrl);
            } catch (photoErr) {
              console.log("Failed to send photo alongside message:", photoErr);
            }
          }
        }

        if (sentMessage) {
          const resolvedChatId = sentMessage.chat.id.toString();
          post.telegramChatId = resolvedChatId;
          post.telegramMessageId = sentMessage.message_id;
          await post.save();
          console.log(`✅ Published to Telegram chat ${resolvedChatId}, message ID: ${sentMessage.message_id}`);
        }
      }
    } catch (err: any) {
      console.log("Telegram send failed:", err?.message || err);
    }
  }

  return NextResponse.json({
    success: true,
    post,
    scheduled: isScheduled,
    publishAt: isScheduled ? scheduleDate?.toISOString() : undefined,
  });
}