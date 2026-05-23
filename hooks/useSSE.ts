"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TelegramMessage } from "@/types";

export function useSSE(chatId?: string) {
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<{ text: string; fromId: string } | null>(null);
  const callbackRef = useRef<((msg: TelegramMessage) => void) | null>(null);

  const onNewMessage = useCallback((cb: (msg: TelegramMessage) => void) => {
    callbackRef.current = cb;
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const eventSource = new EventSource(`/api/inbox/sse${chatId ? `?chatId=${chatId}` : ""}`);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "initial") {
          setMessages(data.messages || []);
          setIsLoading(false);
        } else if (data.type === "new_message") {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id || m.messageId === data.message.messageId)) return prev;
            return [...prev, data.message];
          });
          // Trigger notification callback for incoming messages
          if (data.message.fromId !== "admin" && callbackRef.current) {
            callbackRef.current(data.message);
          }
        }
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [chatId]);

  return { messages, isConnected, isLoading, setMessages, onNewMessage };
}