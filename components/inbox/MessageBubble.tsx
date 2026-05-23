"use client";

import { useState, useRef, useEffect } from "react";
import { TelegramMessage } from "@/types";
import { FileText, Image, Trash2, MoreVertical, CheckCheck } from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import { toast } from "sonner";

interface MessageBubbleProps {
  message: TelegramMessage;
  chatId: string;
  onDelete?: (id: string) => void;
}

export default function MessageBubble({ message, chatId, onDelete }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const isIncoming = message.fromId !== "admin";

  const handleDelete = async () => {
    if (deleting || deleted) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/inbox/${chatId}/messages/${message.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleted(true);
        onDelete?.(message.id);
        toast.success("Message deleted");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
      setShowMenu(false);
    }
  };

  if (deleted) return null;

  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    switch (message.mediaType) {
      case "photo":
        return (
          <div className={`${message.text ? "mt-1.5 -mx-2 -mb-1" : "-mx-2 -mb-1"}`}>
            <img
              src={message.mediaUrl}
              alt="Photo"
              className="max-h-72 sm:max-h-80 w-full object-cover cursor-pointer"
              style={{ borderRadius: isIncoming ? "0 0 12px 12px" : "0 0 12px 12px" }}
              onClick={() => window.open(message.mediaUrl, "_blank")}
            />
          </div>
        );

      case "video":
        return (
          <div className={`${message.text ? "mt-1.5" : ""}`}>
            <video
              src={message.mediaUrl}
              controls
              className="max-h-72 sm:max-h-80 w-full rounded-xl"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case "document":
        return (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2.5 rounded-xl p-2.5 transition-colors ${
              isIncoming ? "hover:bg-white/5" : "hover:bg-white/10"
            }`}
            style={{ backgroundColor: isIncoming ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)" }}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isIncoming ? "bg-blue-500/30" : "bg-white/20"
            }`}>
              <FileText className={`h-4 w-4 ${isIncoming ? "text-blue-400" : "text-white"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-medium truncate ${isIncoming ? "text-white" : "text-white"}`}>Document</p>
              <p className={`text-[10px] sm:text-xs ${isIncoming ? "text-gray-400" : "text-white/70"}`}>Click to view</p>
            </div>
          </a>
        );

      case "audio":
      case "voice":
        return <VoicePlayer src={message.mediaUrl} messageId={message.id} />;

      case "sticker":
        return (
          <div className="mt-0.5">
            <img
              src={message.mediaUrl}
              alt="Sticker"
              className="max-w-28 sm:max-w-36 max-h-28 sm:max-h-36"
            />
          </div>
        );

      case "animation":
        return (
          <div className="mt-1.5">
            <video
              src={message.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="rounded-xl max-h-48 sm:max-h-60 w-full"
            >
              <img src={message.mediaUrl} alt="Animation" className="rounded-xl" />
            </video>
          </div>
        );

      default:
        return (
          <div
            className={`flex items-center gap-2 rounded-xl p-2.5`}
            style={{ backgroundColor: isIncoming ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)" }}
          >
            <Image className={`h-4 w-4 shrink-0 ${isIncoming ? "text-gray-400" : "text-white/70"}`} />
            <a
              href={message.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs sm:text-sm hover:underline truncate ${isIncoming ? "text-blue-400" : "text-white"}`}
            >
              Media file
            </a>
          </div>
        );
    }
  };

  return (
    <div className={`flex ${isIncoming ? "justify-start" : "justify-end"} relative px-1`}>
      <div className={`flex items-end gap-1 max-w-[88%] sm:max-w-[72%] md:max-w-[60%] lg:max-w-[50%] ${isIncoming ? "" : "flex-row-reverse"}`}>
        {/* Three-dot menu — always visible */}
        <div className={`relative flex-shrink-0 self-center ${isIncoming ? "order-2" : "order-1"}`}>
          <button
            ref={menuBtnRef}
            onClick={() => {
              if (showMenu) {
                setShowMenu(false);
              } else {
                // Position menu above the button
                if (menuBtnRef.current) {
                  const rect = menuBtnRef.current.getBoundingClientRect();
                  setMenuPos({
                    top: rect.top - 8,
                    left: isIncoming ? rect.left : rect.right - 130,
                  });
                }
                setShowMenu(true);
              }
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div
                className="fixed z-50"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <div className="rounded-xl shadow-xl py-1 min-w-[130px]" style={{ backgroundColor: "#242F3D", border: "1px solid #2B3B4C" }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Message bubble — Telegram dark style */}
        <div
          className={`px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm ${
            isIncoming
              ? "rounded-2xl rounded-tl-sm"
              : "rounded-2xl rounded-tr-sm"
          }`}
          style={{
            backgroundColor: isIncoming ? "#182533" : "#2B5278",
            color: "#FFFFFF",
          }}
        >
          {message.text && (
            <p className="whitespace-pre-wrap break-words text-sm sm:text-[15px] leading-[1.4]">
              {message.text}
            </p>
          )}
          {renderMedia()}
          
          {/* Timestamp + status row */}
          <div className={`flex items-center justify-end gap-1 ${message.text || renderMedia() ? "mt-1" : ""}`}>
            <span className={`text-[10px] sm:text-[11px] leading-none ${
              isIncoming ? "text-gray-400" : "text-white/60"
            }`}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {!isIncoming && (
              <CheckCheck className="h-3.5 w-3.5 text-white/60" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}