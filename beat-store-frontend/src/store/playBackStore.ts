// /store/playbackStore.ts
import { create } from 'zustand';
import { get30SecondSnippetUrl } from '@/utils/audioUtils';
import { useWaveformStore } from './waveformStore';

interface PlaybackState {
  currentBeatId: number | null;
  audioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  beats: any[];
  isAudioPlayerVisible: boolean;
  play: () => void;
  pause: () => void;
  setCurrentTime: (time: number) => void;
  setBeat: (id: number, url: string) => void;
  setBeats: (beats: any[]) => void;
  setIsAudioPlayerVisible: (visible: boolean) => void;
  nextBeat: () => Promise<void>;
  previousBeat: () => Promise<void>;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentBeatId: null,
  audioUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  beats: [],
  isAudioPlayerVisible: true,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setCurrentTime: time => set({ currentTime: time }),
  setBeats: beats => set({ beats }),
  setIsAudioPlayerVisible: visible => set({ isAudioPlayerVisible: visible }),
  setBeat: (id, url) => {
    const { currentBeatId } = get();
    if (currentBeatId !== id) {
      set({
        currentBeatId: id,
        audioUrl: url,
        isPlaying: true,
        currentTime: 0,
      });
      // Update waveform store with current beat
      useWaveformStore.getState().setCurrentBeat(id);
    }
  },
  nextBeat: async () => {
    const { currentBeatId, beats, isPlaying } = get();
    if (beats.length === 0) return;

    const currentIndex = beats.findIndex(beat => beat.id === currentBeatId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % beats.length;
    const nextBeat = beats[nextIndex];

    // Use snippet_mp3 if available, otherwise generate 30-second snippet from mp3_file
    let audioUrl = nextBeat.snippet_mp3 || null;
    if (!audioUrl && nextBeat.mp3_file) {
      try {
        audioUrl = await get30SecondSnippetUrl(nextBeat.mp3_file);
      } catch (error) {
        console.error(`Failed to create snippet for "${nextBeat.name}":`, error);
        audioUrl = nextBeat.mp3_file || null;
      }
    }

    set({
      currentBeatId: nextBeat.id,
      audioUrl: audioUrl || nextBeat.mp3_file || null,
      isPlaying,
      currentTime: 0,
    });
  },
  previousBeat: async () => {
    const { currentBeatId, beats, isPlaying } = get();
    if (beats.length === 0) return;

    const currentIndex = beats.findIndex(beat => beat.id === currentBeatId);
    if (currentIndex === -1) return;

    const previousIndex = currentIndex === 0 ? beats.length - 1 : currentIndex - 1;
    const previousBeat = beats[previousIndex];

    // Use snippet_mp3 if available, otherwise generate 30-second snippet from mp3_file
    let audioUrl = previousBeat.snippet_mp3 || null;
    if (!audioUrl && previousBeat.mp3_file) {
      try {
        audioUrl = await get30SecondSnippetUrl(previousBeat.mp3_file);
      } catch (error) {
        console.error(`Failed to create snippet for "${previousBeat.name}":`, error);
        audioUrl = previousBeat.mp3_file || null;
      }
    }

    set({
      currentBeatId: previousBeat.id,
      audioUrl: audioUrl || previousBeat.mp3_file || null,
      isPlaying,
      currentTime: 0,
    });
  },
}));
