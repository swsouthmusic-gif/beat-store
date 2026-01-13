// components/Waveform.tsx
import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useWaveformStore } from '@/store/waveformStore';

interface WaveformProps {
  url: string;
  isCurrent: boolean;
  beatId: number;
  audioElementId?: string;
  waveColor?: string;
  progressColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  onReady?: () => void;
}

const Waveform = ({
  url,
  isCurrent = false,
  beatId,
  waveColor = '#373737',
  progressColor = '#ffffff',
  height = 60,
  barWidth = 2,
  barGap = 2,
  barRadius = 4,
  onReady,
}: WaveformProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerInstance, unregisterInstance, currentBeatId, currentTime, duration } =
    useWaveformStore();
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Create the WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      barWidth,
      barGap,
      barRadius,
      cursorWidth: 0,
      mediaControls: false,
      interact: false,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(url);

    // Register this instance with the store
    registerInstance(url, beatId, wavesurfer);

    wavesurfer.on('ready', () => {
      onReady?.();
    });

    return () => {
      unregisterInstance(url, wavesurfer);
      wavesurfer.destroy();
    };
  }, [
    url,
    beatId,
    height,
    waveColor,
    progressColor,
    barWidth,
    barGap,
    barRadius,
    registerInstance,
    unregisterInstance,
    onReady,
  ]);

  // Update progress when currentTime changes (synced from waveform store)
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || !isCurrent || beatId !== currentBeatId) return;

    const wavesurferDuration = wavesurfer.getDuration();
    if (wavesurferDuration > 0 && currentTime > 0 && duration > 0) {
      try {
        // Use the duration from the store if available, otherwise use wavesurfer's duration
        const targetDuration = duration || wavesurferDuration;
        wavesurfer.seekTo(currentTime / targetDuration);
      } catch (error) {
        // Ignore errors if wavesurfer is not ready
      }
    }
  }, [isCurrent, currentTime, duration, beatId, currentBeatId]);

  // Reset progress when not current
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer || isCurrent) return;

    try {
      wavesurfer.seekTo(0);
    } catch (error) {
      // Ignore errors
    }
  }, [isCurrent]);

  return <div ref={containerRef} className="waveform" />;
};

export default React.memo(Waveform, (prev, next) => {
  return prev.url === next.url && prev.isCurrent === next.isCurrent;
});
