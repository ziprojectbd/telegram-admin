import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/lib/telegram';

/**
 * POST /api/webhook/telegram
 *
 * Receives updates from Telegram and feeds them to the bot singleton
 * via processUpdate(). The bot's event listeners (onText, on('message'), etc.)
 * are attached once when the singleton is created.
 *
 * Secret token verification prevents unauthorized requests.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify secret token if configured
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) {
      const header = req.headers.get('x-telegram-bot-api-secret-token');
      if (header !== secret) {
        console.warn('⚠️ Webhook received with invalid secret token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();

    // Get the singleton bot and process the update
    const bot = await getBot();
    bot.processUpdate(body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error?.message || error);
    // Always return 200 to Telegram to prevent retry storms
    return NextResponse.json({ error: 'Failed to process update' }, { status: 200 });
  }
}

/**
 * GET /api/webhook/telegram — Health check only.
 * Webhook setup is done via setupWebhook() in lib/telegram.ts,
 * called from the app layout on startup.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: 'webhook',
    message: 'Telegram webhook endpoint is ready',
  });
}