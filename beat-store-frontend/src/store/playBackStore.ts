// /store/playbackStore.ts
import { create } from 'zustand';

interface PlaybackState {
  currentBeatId: number | null;
  audioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  beats: any[];
  play: () => void;
  pause: () => void;
  setCurrentTime: (time: number) => void;
  setBeat: (id: number, url: string) => void;
  setBeats: (beats: any[]) => void;
  nextBeat: () => void;
  previousBeat: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentBeatId: null,
  audioUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  beats: [],
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setCurrentTime: time => set({ currentTime: time }),
  setBeats: beats => set({ beats }),
  setBeat: (id, url) => {
    const { currentBeatId } = get();
    if (currentBeatId !== id) {
      set({
        currentBeatId: id,
        audioUrl: url,
        isPlaying: true,
        currentTime: 0,
      });
    }
  },
  nextBeat: () => {
    const { currentBeatId, beats, isPlaying } = get();
    if (beats.length === 0) return;

    const currentIndex = beats.findIndex(beat => beat.id === currentBeatId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % beats.length;
    const nextBeat = beats[nextIndex];

    set({
      currentBeatId: nextBeat.id,
      audioUrl: nextBeat.snippet_mp3,
      isPlaying,
      currentTime: 0,
    });
  },
  previousBeat: () => {
    const { currentBeatId, beats, isPlaying } = get();
    if (beats.length === 0) return;

    const currentIndex = beats.findIndex(beat => beat.id === currentBeatId);
    if (currentIndex === -1) return;

    const previousIndex = currentIndex === 0 ? beats.length - 1 : currentIndex - 1;
    const previousBeat = beats[previousIndex];

    set({
      currentBeatId: previousBeat.id,
      audioUrl: previousBeat.snippet_mp3,
      isPlaying,
      currentTime: 0,
    });
  },
}));
