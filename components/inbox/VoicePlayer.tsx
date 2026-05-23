"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { useAudioManager } from "@/lib/AudioContext";

interface VoicePlayerProps {
  src: string;
  messageId: string; // unique identifier for each voice message
}

export default function VoicePlayer({ src, messageId }: VoicePlayerProps) {
  const { currentlyPlayingId, play, pause } = useAudioManager();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isThisPlaying = currentlyPlayingId === messageId;

  useEffect(() => {
    if (src.startsWith("http") || src.startsWith("blob:")) {
      setAudioUrl(src);
    } else {
      fetch(`/api/inbox/files/${src}`)
        .then(async (res) => {
          if (res.redirected) setAudioUrl(res.url);
          else {
            const data = await res.json();
            if (data.url) setAudioUrl(data.url);
          }
        })
        .catch(console.error);
    }
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const onEnd = () => {
      pause();
      setCurrentTime(0);
    };

    if (audio.readyState >= 1 && audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);
    }

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", onEnd);
    };
  }, [audioUrl, pause]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isThisPlaying) {
      // Pause this audio
      pause();
    } else {
      // Play this audio via central manager (stops any others)
      play(messageId, audio);
    }
  }, [isThisPlaying, messageId, play, pause, audioUrl]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = percent * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const bars = Array.from({ length: 28 }).map((_, i) => {
    const h = Math.sin(i * 0.25 + 1.5) * 20 + 30 + Math.sin(i * 0.8) * 8;
    return Math.max(15, Math.min(90, h));
  });

  return (
    <div className="w-full mt-1.5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-[20px] transition-colors duration-200 ${
          isThisPlaying ? "bg-white/20" : "bg-white/10"
        }`}
      >
        {/* Play / Pause button */}
        <button
          onClick={togglePlay}
          disabled={!audioUrl}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/20 transition-transform duration-150 active:scale-90 disabled:opacity-40"
        >
          {isThisPlaying ? (
            <Pause className="h-3.5 w-3.5 text-white" fill="white" />
          ) : (
            <Play className="h-3.5 w-3.5 ml-0.5 text-white" fill="white" />
          )}
        </button>

        {/* Progress bar + waveform */}
        <div
          ref={progressRef}
          className="flex-1 flex flex-col gap-1 cursor-pointer min-w-0"
          onClick={handleSeek}
        >
          {/* Waveform */}
          <div className="flex items-center gap-[2px] h-6 overflow-hidden">
            {bars.map((h, i) => {
              const isActive = (i / bars.length) * 100 <= progress;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-100"
                  style={{
                    height: `${h}%`,
                    maxHeight: "24px",
                    minHeight: "2px",
                    backgroundColor: isActive ? "#2AABEE" : "rgba(255,255,255,0.2)",
                  }}
                />
              );
            })}
          </div>

          {/* Seek bar */}
          <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                backgroundColor: "#2AABEE",
              }}
            />
          </div>
        </div>

        {/* Duration */}
        <span className="text-[10px] font-mono font-medium text-white/50 shrink-0 w-8 text-right">
          {formatTime(currentTime || duration || 0)}
        </span>
      </div>
    </div>
  );
}