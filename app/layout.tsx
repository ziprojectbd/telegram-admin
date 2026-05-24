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

// Initialize Telegram bot webhook ONCE at app startup.
// Uses a globalThis guard to prevent duplicate setup on Next.js hot reload.
if (
  typeof globalThis !== 'undefined' &&
  typeof window === 'undefined' &&
  !(globalThis as any).__tgLayoutInitDone
) {
  (globalThis as any).__tgLayoutInitDone = true;
  (async () => {
    try {
      const [{ setupWebhook }, { loadDbUriFromSettings }] = await Promise.all([
        import("@/lib/telegram"),
        import("@/lib/db"),
      ]);
      await loadDbUriFromSettings();
      await setupWebhook();
      console.log("🤖 Telegram bot webhook configured (from layout)");
    } catch (err) {
      console.error("Failed to setup Telegram webhook:", err);
    }
  })();
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