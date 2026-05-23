"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TelegramChat } from "@/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import ChatListSkeleton from "./ChatListSkeleton";

interface ChatListProps {
  onClose?: () => void;
  onSelectChat?: (chatId: string) => void;
}

export default function ChatList({ onClose, onSelectChat }: ChatListProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadChats = () => {
    fetch("/api/inbox/chats")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((chat: any) => ({
            ...chat,
            id: chat._id?.toString() || chat.id,
          }));
          setChats(mapped);
        } else {
          setChats([]);
        }
      })
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChats();

    // Poll every 5 seconds for real-time updates
    intervalRef.current = setInterval(loadChats, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full lg:w-80 xl:w-96 flex flex-col h-full" style={{ backgroundColor: "#0E1621", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold text-lg" style={{ color: "#A3B3C7" }}>Inbox</h2>
          {(() => {
            const totalUnread = chats.reduce((sum, c) => sum + ((c as any).unreadCount || 0), 0);
            if (totalUnread === 0) return null;
            return (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2AABEE] text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            );
          })()}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm p-4 text-center">
            No chats yet. When a user starts the bot, they will appear here.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = pathname === `/inbox/${chat.chatId}`;
            const initials = chat.firstName
              ? chat.firstName.charAt(0).toUpperCase() + (chat.lastName?.charAt(0)?.toUpperCase() || "")
              : chat.title?.charAt(0)?.toUpperCase() || "?";

            return (
              <Link
                key={chat.chatId}
                href={`/inbox/${chat.chatId}`}
                onClick={() => onSelectChat?.(chat.chatId)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 transition-colors",
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                )}
                style={isActive ? { backgroundColor: "rgba(255,255,255,0.1)" } : undefined}
              >
                <Avatar className="w-12 h-12 shrink-0">
                  {chat.profilePhoto ? (
                    <AvatarImage src={chat.profilePhoto} alt={chat.title} />
                  ) : null}
                  <AvatarFallback className="text-sm bg-blue-500/20 text-blue-400">
                    {chat.type === "private" ? initials : chat.type === "group" ? "👥" : "📢"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "#E8ECF1" }}>{chat.title}</p>
                      {chat.blocked && (
                        <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0 leading-none">
                          Blocked
                        </span>
                      )}
                    </div>
                    {chat.lastMessageTime && (
                      <p className="text-[11px] text-gray-500 shrink-0 ml-2">
                        {chat.lastMessageTime}
                      </p>
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: "#8E9BB5" }}>
                    {(chat as any).lastMessagePreview || (chat.username ? `@${chat.username}` : `Chat started via Telegram`)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}