"use client";

import { useState, useEffect } from "react";
import ChatList from "@/components/inbox/ChatList";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InboxPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChatSelect = (chatId: string) => {
    router.push(`/inbox/${chatId}`);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex">
      {/* Chat List - visible by default on all screen sizes since there's no active chat */}
      <ChatList onSelectChat={handleChatSelect} />

      {/* Empty state - hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-base">Select a chat from the list</p>
          <p className="text-zinc-700 text-sm mt-1">to start messaging</p>
        </div>
      </div>
    </div>
  );
}