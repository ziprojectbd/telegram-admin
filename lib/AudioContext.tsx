"use client";

import React, { createContext, useContext, useRef, useCallback, useState } from "react";

interface AudioState {
  currentlyPlayingId: string | null;
  play: (id: string, audio: HTMLAudioElement) => void;
  pause: () => void;
  stopAll: () => void;
}

const AudioContext = createContext<AudioState>({
  currentlyPlayingId: null,
  play: () => {},
  pause: () => {},
  stopAll: () => {},
});

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAll = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setCurrentlyPlayingId(null);
  }, []);

  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    setCurrentlyPlayingId(null);
  }, []);

  const play = useCallback((id: string, audio: HTMLAudioElement) => {
    // If same audio is already playing, pause it
    if (currentlyPlayingId === id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setCurrentlyPlayingId(null);
      currentAudioRef.current = null;
      return;
    }

    // Stop any currently playing audio
    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    // Play the new audio
    currentAudioRef.current = audio;
    audio.play().catch(() => {});
    setCurrentlyPlayingId(id);
  }, [currentlyPlayingId]);

  return (
    <AudioContext.Provider value={{ currentlyPlayingId, play, pause, stopAll }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudioManager = () => useContext(AudioContext);