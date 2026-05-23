import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bot } from "@/lib/telegram";
import dbConnect from "@/lib/db";
import TelegramMessage from "@/models/TelegramMessage";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial batch of messages
      try {
        await dbConnect();
        const query = chatId ? { chatId } : {};
        const initialMessages = await TelegramMessage.find(query)
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        const mapped = await Promise.all(
          initialMessages.map(async (msg: any) => {
            let resolvedUrl = msg.mediaUrl;
            // If mediaUrl is a Telegram file_id (not a URL), resolve it
            if (resolvedUrl && !resolvedUrl.startsWith("http") && !resolvedUrl.startsWith("blob:")) {
              try {
                const fileLink = await bot.getFileLink(resolvedUrl);
                resolvedUrl = fileLink;
              } catch {
                // Keep original if resolution fails
              }
            }
            return {
              ...msg,
              id: msg._id.toString(),
              _id: undefined,
              mediaUrl: resolvedUrl,
            };
          })
        );
        // Reverse to chronological order
        mapped.reverse();

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "initial", messages: mapped })}\n\n`
          )
        );
      } catch (e) {
        console.error(e);
      }

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Poll every 2 seconds for new messages
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        try {
          await dbConnect();
          const query: any = chatId ? { chatId } : {};
          query.timestamp = { $gt: lastCheck };
          const latestMessages = await TelegramMessage.find(query)
            .sort({ timestamp: -1 })
            .lean();

          if (latestMessages.length > 0) {
            lastCheck = new Date();
            
            // Resolve file_ids for new messages too
            const resolved = await Promise.all(
              latestMessages.map(async (msg: any) => {
                let resolvedUrl = msg.mediaUrl;
                if (resolvedUrl && !resolvedUrl.startsWith("http") && !resolvedUrl.startsWith("blob:")) {
                  try {
                    const fileLink = await bot.getFileLink(resolvedUrl);
                    resolvedUrl = fileLink;
                  } catch {
                    // Keep original if resolution fails
                  }
                }
                return {
                  ...msg,
                  id: msg._id.toString(),
                  _id: undefined,
                  mediaUrl: resolvedUrl,
                };
              })
            );
            
            const mapped = resolved.reverse();

            for (const message of mapped) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "new_message",
                    message,
                  })}\n\n`
                )
              );
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);

      // Cleanup on close
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