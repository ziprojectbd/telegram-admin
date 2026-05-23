import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bot } from "@/lib/telegram";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";
import TelegramMessage from "@/models/TelegramMessage";

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const text = formData.get("text") as string | null;
  const mediaFile = formData.get("media") as File | null;
  const voiceFile = formData.get("voice") as File | null;

  const chatId = params.chatId;

  // Check if user is blocked
  await dbConnect();
  const chat = await TelegramChat.findOne({ chatId }).lean();
  if (chat && (chat as any).blocked) {
    return NextResponse.json({ error: "This user has been blocked. Unblock them to send messages." }, { status: 403 });
  }

  try {
    let sentMessage: any;

    if (voiceFile) {
      // Send as voice message (audio/ogg)
      const buffer = Buffer.from(await voiceFile.arrayBuffer());
      sentMessage = await bot.sendVoice(chatId, buffer, {
        caption: text || undefined,
      });
    } else if (mediaFile) {
      const buffer = Buffer.from(await mediaFile.arrayBuffer());
      const mimeType = mediaFile.type;

      if (mimeType.startsWith("image/")) {
        sentMessage = await bot.sendPhoto(chatId, buffer, {
          caption: text || undefined,
        });
      } else if (mimeType.startsWith("video/")) {
        sentMessage = await bot.sendVideo(chatId, buffer, {
          caption: text || undefined,
        });
      } else {
        sentMessage = await bot.sendDocument(chatId, buffer, {
          caption: text || undefined,
        });
      }
    } else if (text) {
      sentMessage = await bot.sendMessage(chatId, text);
    } else {
      return NextResponse.json({ error: "No text or media provided" }, { status: 400 });
    }

    // Save the outgoing admin reply message to the database
    await dbConnect();

    // Determine the file_id before saving
    const rawMediaUrl = sentMessage.voice
      ? sentMessage.voice.file_id
      : sentMessage.photo
      ? sentMessage.photo[sentMessage.photo.length - 1].file_id
      : sentMessage.video
      ? sentMessage.video.file_id
      : sentMessage.document
      ? sentMessage.document.file_id
      : undefined;

    // Resolve file_id to real URL immediately so frontend can display it
    let resolvedMediaUrl = rawMediaUrl;
    if (rawMediaUrl && !rawMediaUrl.startsWith("http")) {
      try {
        resolvedMediaUrl = await bot.getFileLink(rawMediaUrl);
      } catch {
        // Keep file_id if resolution fails
      }
    }

    const saved = await TelegramMessage.create({
      messageId: sentMessage.message_id,
      chatId,
      fromId: "admin",
      text: text || undefined,
      mediaUrl: rawMediaUrl, // store file_id in DB (SSE will resolve too)
      mediaType: voiceFile
        ? "voice"
        : mediaFile
        ? mediaFile.type.startsWith("image/")
          ? "photo"
          : mediaFile.type.startsWith("video/")
          ? "video"
          : "document"
        : undefined,
      timestamp: new Date(),
    });

    // Return the full saved message — resolved URL so frontend shows it immediately
    const savedMessage = {
      id: saved._id.toString(),
      messageId: saved.messageId,
      chatId: saved.chatId,
      fromId: saved.fromId,
      text: saved.text,
      mediaUrl: resolvedMediaUrl, // ← real URL, not file_id
      mediaType: saved.mediaType,
      timestamp: saved.timestamp,
    };

    return NextResponse.json({ success: true, message: savedMessage });
  } catch (error) {
    console.error("Reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}