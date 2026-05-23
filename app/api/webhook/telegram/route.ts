import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    bot.processUpdate(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Failed to process update" }, { status: 500 });
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint is ready. Bot polling is active.",
  });
}
