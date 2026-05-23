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
// This import triggers the module-level code in lib/telegram.ts
// that creates the bot instance with polling: true and registers
// event listeners for /start, message, etc.
async function initTelegramBot() {
  try {
    // Dynamic import ensures it only runs on the server
    await import("@/lib/telegram");
    console.log("🤖 Telegram bot initialized");
  } catch (err) {
    console.error("Failed to initialize Telegram bot:", err);
  }
}

// Call initialization eagerly so bot starts polling on first server request
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
