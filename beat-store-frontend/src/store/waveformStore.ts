// /store/waveformStore.ts
import { create } from 'zustand';
import WaveSurfer from 'wavesurfer.js';

interface WaveformInstance {
  wavesurfer: WaveSurfer;
  url: string;
  beatId: number;
}

interface WaveformState {
  instances: Map<string, WaveformInstance[]>;
  currentBeatId: number | null;
  currentTime: number;
  duration: number;
  registerInstance: (url: string, beatId: number, wavesurfer: WaveSurfer) => void;
  unregisterInstance: (url: string, wavesurfer: WaveSurfer) => void;
  updateProgress: (beatId: number, currentTime: number, duration: number) => void;
  setCurrentBeat: (beatId: number | null) => void;
}

export const useWaveformStore = create<WaveformState>((set, get) => ({
  instances: new Map(),
  currentBeatId: null,
  currentTime: 0,
  duration: 0,

  registerInstance: (url, beatId, wavesurfer) => {
    set(state => {
      const newInstances = new Map(state.instances);
      const urlInstances = newInstances.get(url) || [];
      urlInstances.push({ wavesurfer, url, beatId });
      newInstances.set(url, urlInstances);
      return { instances: newInstances };
    });
  },

  unregisterInstance: (url, wavesurfer) => {
    set(state => {
      const newInstances = new Map(state.instances);
      const urlInstances = newInstances.get(url) || [];
      const filtered = urlInstances.filter(inst => inst.wavesurfer !== wavesurfer);
      if (filtered.length === 0) {
        newInstances.delete(url);
      } else {
        newInstances.set(url, filtered);
      }
      return { instances: newInstances };
    });
  },

  updateProgress: (beatId, currentTime, duration) => {
    const { instances, currentBeatId } = get();

    set({ currentTime, duration });

    // Update progress for all instances of the current beat
    if (beatId === currentBeatId && duration > 0) {
      instances.forEach(urlInstances => {
        urlInstances.forEach(instance => {
          if (instance.beatId === beatId) {
            try {
              const wavesurferDuration = instance.wavesurfer.getDuration();
              if (wavesurferDuration > 0) {
                instance.wavesurfer.seekTo(currentTime / wavesurferDuration);
              }
            } catch (error) {
              // Ignore errors if wavesurfer is not ready
            }
          }
        });
      });
    }
  },

  setCurrentBeat: beatId => {
    set({ currentBeatId: beatId, currentTime: 0 });

    // Reset progress for all non-current instances
    const { instances } = get();
    instances.forEach(urlInstances => {
      urlInstances.forEach(instance => {
        if (instance.beatId !== beatId) {
          try {
            instance.wavesurfer.seekTo(0);
          } catch (error) {
            // Ignore errors
          }
        }
      });
    });
  },
}));
