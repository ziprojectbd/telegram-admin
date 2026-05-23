import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AudioProvider } from "@/lib/AudioContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Telegram Admin Panel",
  description: "Manage your Telegram bot, posts, inbox & settings",
};

// Initialize Telegram bot polling when the app starts.
// This triggers startBotPolling() which reads the token from DB and starts polling.
// API routes use getBot() which does NOT start polling, preventing 409 Conflicts.
async function initTelegramBot() {
  try {
    const { startBotPolling } = await import("@/lib/telegram");
    await startBotPolling();
    console.log("🤖 Telegram bot polling started (from layout)");
  } catch (err) {
    console.error("Failed to initialize Telegram bot:", err);
  }
}

// Call initialization eagerly so bot starts polling on first server request.
// Since only this single place starts polling, there will be no 409 Conflict errors.
if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
  initTelegramBot();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AudioProvider>
            {children}
          </AudioProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#17212B",
                color: "#E8ECF1",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "13px",
                padding: "10px 16px",
              },
              className: "!max-w-[95vw] sm:!max-w-[380px]",
            }}
            visibleToasts={3}
            closeButton
            richColors={false}
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
