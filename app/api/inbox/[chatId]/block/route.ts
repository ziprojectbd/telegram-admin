import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramChat from "@/models/TelegramChat";

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();

  const { action } = await req.json(); // "block" or "unblock"

  if (action === "block") {
    const result = await TelegramChat.findOneAndUpdate(
      { chatId: params.chatId },
      { $set: { blocked: true } },
      { new: true }
    );
    if (!result) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json({ blocked: true });
  } else if (action === "unblock") {
    const result = await TelegramChat.findOneAndUpdate(
      { chatId: params.chatId },
      { $set: { blocked: false } },
      { new: true }
    );
    if (!result) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json({ blocked: false });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}