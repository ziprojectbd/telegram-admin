import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import TelegramMessage from "@/models/TelegramMessage";

export async function GET(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await dbConnect();
  const messages = await TelegramMessage.find({ chatId: params.chatId })
    .sort({ timestamp: 1 })
    .lean();

  // Map _id to id for frontend compatibility
  const mapped = messages.map((msg: any) => ({
    ...msg,
    id: msg._id.toString(),
    _id: undefined,
  }));

  return NextResponse.json(mapped);
}
