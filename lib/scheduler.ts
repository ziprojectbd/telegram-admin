import dbConnect from "./db";
import Post from "@/models/Post";
import { bot } from "./telegram";

/**
 * Check for due scheduled posts and publish them to Telegram.
 * Called every 10 seconds when the app is running.
 */
async function checkScheduledPosts() {
  try {
    await dbConnect();

    const now = new Date();
    const duePosts = await Post.find({
      published: false,
      scheduledAt: { $lte: now },
    });

    if (duePosts.length > 0) {
      console.log(`📅 Scheduler: ${duePosts.length} post(s) due for publishing`);
    }

    for (const post of duePosts) {
      try {
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
          console.error("📅 TELEGRAM_CHAT_ID not set, skipping scheduled post");
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
            } catch {
              // Ignore photo send errors
            }
          }
        }

        post.published = true;
        post.publishedAt = new Date();
        if (sentMessage) {
          post.telegramChatId = sentMessage.chat.id.toString();
          post.telegramMessageId = sentMessage.message_id;
        }
        await post.save();

        console.log(`📅✅ Scheduled post "${post.title}" published to Telegram`);
      } catch (err: any) {
        console.error(`📅❌ Failed to publish "${post.title}":`, err?.message || err);
      }
    }
  } catch (err) {
    // Silently handle DB connection errors on repeated attempts
  }
}

/**
 * Start the scheduler — checks for due posts every 30 seconds
 */
export function startScheduler() {
  if ((globalThis as any).__schedulerStarted) return; // already running across hot reloads

  (globalThis as any).__schedulerStarted = true;

  // Run immediately on start
  checkScheduledPosts();

  // Then check every 10 seconds for near-exact delivery
  setInterval(checkScheduledPosts, 10_000);
  console.log("📅 Post scheduler started (checking every 10s)");
}
