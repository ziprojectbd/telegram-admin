"use client";

import { useState, useEffect } from "react";
import ChatWindow from "@/components/inbox/ChatWindow";
import ChatList from "@/components/inbox/ChatList";
import { Menu } from "lucide-react";

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="h-full flex relative" style={{ backgroundColor: "#0E1621" }}>
      {/* Chat List - hidden on mobile (full screen chat), shown on lg+ */}
      <div className="hidden lg:block h-full">
        <ChatList onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile overlay sidebar */}
      <div
        className={`
          lg:hidden fixed inset-0 z-50 transition-all duration-300
          ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-80 transition-transform duration-300
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          style={{ backgroundColor: "#17212B" }}
        >
          <ChatList onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Chat Window - takes full screen on mobile */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: "#0E1621" }}>
        {/* Mobile header - Telegram dark */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2.5 border-b" style={{ backgroundColor: "#17212B", borderColor: "#1E2B3A" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-400" />
          </button>
          <span className="text-sm font-medium text-white truncate">
            Chats
          </span>
        </div>

        <ChatWindow chatId={params.chatId} />
      </div>
    </div>
  );
}