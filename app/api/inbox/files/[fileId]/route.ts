import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Resolve the Telegram file_id to a download URL
    const fileLink = await bot.getFileLink(params.fileId);
    
    // Return the URL as JSON so frontend can use it
    return NextResponse.json({ url: fileLink });
  } catch (error: any) {
    console.error("File resolve error:", error?.message || error);
    return NextResponse.json({ error: "Failed to resolve file" }, { status: 500 });
  }
}