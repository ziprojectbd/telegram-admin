import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";
import Post from "@/models/Post";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendStats = async () => {
        try {
          await dbConnect();

          const [totalChats, activeChatIds, totalUnread, totalPosts] = await Promise.all([
            TelegramChat.countDocuments({}),
            TelegramMessage.distinct("chatId", { text: { $not: /^\/start/ } }),
            TelegramMessage.countDocuments({
              fromId: { $ne: "admin" },
              read: false,
            }),
            Post.countDocuments({ published: true }),
          ]);
          const activeChats = activeChatIds.length;

          // Bot is always Online — API availability proves it's operational
          const botStatus = "Online";

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                totalChats,
                activeChats,
                totalUnread,
                totalPosts,
                botStatus,
              })}\n\n`
            )
          );
        } catch (e) {
          console.error("SSE stats error:", e);
        }
      };

      // Send initial stats
      await sendStats();

      // Poll every 2 seconds for real-time updates
      const interval = setInterval(sendStats, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}