"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TelegramMessage } from "@/types";
import { useSSE } from "@/hooks/useSSE";
import MessageBubble from "./MessageBubble";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Image, X, ChevronLeft, Mic, Square, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function MessageSkeleton() {
  return (
    <div className="flex px-1 mb-2">
      <div className="flex items-end gap-1 max-w-[72%]">
        <div className="flex-1 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 animate-pulse">
          <div className="h-3 bg-white/10 rounded w-full mb-2" />
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-2 bg-white/10 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

function VoiceSkeleton() {
  return (
    <div className="flex px-1 mb-2 justify-end">
      <div className="flex items-end gap-1 max-w-[72%] flex-row-reverse">
        <div className="flex-1 px-4 py-3 rounded-2xl rounded-tr-sm bg-blue-600/40 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex gap-[2px] h-6 items-end">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-full bg-white/10" style={{ height: `${Math.random() * 60 + 20}%` }} />
                ))}
              </div>
              <div className="h-2 bg-white/10 rounded w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({ chatId }: { chatId: string }) {
  const { messages, setMessages, isLoading, onNewMessage } = useSSE(chatId);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatUsername, setChatUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/inbox/chats")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const chat = data.find((c: any) => c.chatId === chatId);
          if (chat) {
            setChatTitle(chat.title || `Chat ${chatId.slice(0, 8)}`);
            setChatUsername(chat.username || "");
          }
        }
      })
      .catch(() => setChatTitle(`Chat ${chatId.slice(0, 8)}`));
  }, [chatId]);

  // Register new message notification
  useEffect(() => {
    onNewMessage((msg) => {
      const sender = chatTitle || "User";
      const preview = msg.text || msg.mediaType || "New message";
      const snippet = preview.length > 50 ? preview.slice(0, 50) + "..." : preview;
      toast(`${sender}: ${snippet}`, {
        duration: 4000,
        style: {
          backgroundColor: "#17212B",
          color: "#E8ECF1",
          border: "1px solid rgba(255,255,255,0.1)",
        },
        icon: "💬",
      });
    });
  }, [onNewMessage, chatTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setIsRecording(false);
        // Stop the microphone stream
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            // Auto-stop at 60 seconds (Telegram limit)
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sendReply = async () => {
    if (!newMessage.trim() && !selectedFile && !audioBlob) return;

    setSending(true);
    try {
      const formData = new FormData();
      if (newMessage.trim()) formData.append("text", newMessage);
      if (selectedFile) formData.append("media", selectedFile);
      if (audioBlob) {
        // Create a file from the blob and append as media
        const audioFile = new File([audioBlob], `voice_${Date.now()}.ogg`, { type: "audio/ogg" });
        formData.append("voice", audioFile);
      }

      const res = await fetch(`/api/inbox/${chatId}/reply`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          const savedMsg: TelegramMessage = {
            id: data.message.id,
            messageId: data.message.messageId,
            chatId: data.message.chatId,
            fromId: data.message.fromId,
            text: data.message.text,
            mediaUrl: data.message.mediaUrl,
            mediaType: data.message.mediaType,
            timestamp: new Date(data.message.timestamp),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === savedMsg.id || m.messageId === savedMsg.messageId)) return prev;
            return [...prev, savedMsg];
          });
        }
        setNewMessage("");
        setSelectedFile(null);
        setAudioBlob(null);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to send reply");
      }
    } catch (err) {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File too large. Max 50MB allowed.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: "#0E1621" }}>
      {/* Chat Header */}
      <div style={{ backgroundColor: "#17212B" }} className="px-4 py-2.5 border-b border-gray-700/30 flex items-center gap-2">
        <button
          onClick={() => router.push("/inbox")}
          className="lg:hidden p-1 -ml-1 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-white truncate">{chatTitle}</h3>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-gray-400">
              {chatUsername ? `@${chatUsername}` : chatId}
            </p>
            <button
              onClick={() => {
                const copyText = chatUsername ? `@${chatUsername}` : chatId;
                navigator.clipboard.writeText(copyText);
                toast.success(chatUsername ? "Username copied" : "Chat ID copied");
              }}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              title={chatUsername ? "Copy username" : "Copy chat ID"}
            >
              <Copy className="h-3 w-3 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5"
        style={{ backgroundColor: "#0E1621" }}
      >
        {isLoading ? (
          /* Skeleton loading state */
          <div className="py-4 space-y-4">
            <MessageSkeleton />
            <VoiceSkeleton />
            <MessageSkeleton />
            <div className="flex justify-center my-2">
              <div className="h-5 w-32 rounded-full bg-white/5 animate-pulse" />
            </div>
            <VoiceSkeleton />
            <MessageSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center rounded-xl px-6 py-8" style={{ backgroundColor: "#17212B" }}>
              <div className="w-16 h-16 mx-auto mb-4 bg-[#2B5278]/30 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-[#6AB4F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm">No messages yet</p>
              <p className="text-gray-500 text-xs mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : messages.map((msg, i) => {
          const showDate =
            i === 0 ||
            new Date(msg.timestamp).toDateString() !==
              new Date(messages[i - 1].timestamp).toDateString();
          return (
            <div key={msg.id || msg.messageId}>
              {showDate && (
                <div className="flex justify-center my-2">
                  <span className="text-[11px] text-gray-400 px-3 py-1 rounded-full" style={{ backgroundColor: "#17212B" }}>
                    {new Date(msg.timestamp).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} chatId={chatId} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div style={{ backgroundColor: "#17212B", borderTopColor: "#1E2B3A" }} className="px-3 py-2.5 sm:px-4 sm:py-3 border-t">
        {/* Selected file preview */}
        {selectedFile && (
          <div className="mb-2.5 flex items-center gap-3 rounded-xl p-2.5" style={{ backgroundColor: "#1E2B3A", border: "1px solid #2B3B4C" }}>
            {selectedFile.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="preview"
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2B3B4C" }}>
                <Image className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 rounded-lg transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        )}

        {/* Audio recording preview */}
        {audioBlob && !isRecording && (
          <div className="mb-2.5 flex items-center gap-3 rounded-xl p-2.5" style={{ backgroundColor: "#1E2B3A", border: "1px solid #2B3B4C" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EF5350" }}>
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200">Voice message</p>
              <p className="text-xs text-gray-500">{(audioBlob.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => setAudioBlob(null)}
              className="p-1 rounded-lg transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        )}

        {/* Recording UI — Telegram style */}
        {isRecording ? (
          <div className="flex gap-2 items-center">
            <button
              onClick={cancelRecording}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center gap-3 rounded-xl px-4 py-2" style={{ backgroundColor: "#242F3D" }}>
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div className="flex-1 flex items-center gap-1 h-8">
                {/* Animated waveform bars */}
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${Math.max(15, Math.sin((recordingTime * 10 + i) * 0.5) * 20 + 50)}%`,
                      backgroundColor: i % 2 === 0 ? "#2AABEE" : "#6AB4F0",
                      opacity: 0.6 + Math.random() * 0.4,
                      transition: "height 0.15s ease",
                      maxHeight: "32px",
                      minHeight: "4px",
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-white font-mono w-10 text-right shrink-0">{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="p-2.5 text-white rounded-full transition-colors shrink-0"
              style={{ backgroundColor: "#2AABEE" }}
            >
              <Square className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors rounded-full hover:bg-white/5"
              disabled={sending}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message"
                onKeyDown={handleKeyPress}
                disabled={sending}
                className="w-full border-0 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-[#2B5278]"
                style={{ backgroundColor: "#242F3D" }}
              />
            </div>

            {/* Voice / Send toggle */}
            {newMessage.trim() || selectedFile || audioBlob ? (
              <button
                onClick={sendReply}
                disabled={sending || (!newMessage.trim() && !selectedFile && !audioBlob)}
                className="p-2 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                style={{ backgroundColor: "#2AABEE" }}
              >
                <Send className={`h-5 w-5 ${sending ? "animate-pulse" : ""}`} />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2 text-white rounded-full transition-colors shrink-0"
                style={{ backgroundColor: "#2AABEE" }}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}