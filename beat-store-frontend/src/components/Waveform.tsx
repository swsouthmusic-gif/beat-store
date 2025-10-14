// components/Waveform.tsx
import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  url: string;
  isCurrent: boolean;
  audioElementId?: string;
  waveColor?: string;
  progressColor?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
}

const Waveform = ({
  url,
  isCurrent = false,
  waveColor = '#373737',
  progressColor = '#ffffff',
  height = 60,
  barWidth = 2,
  barGap = 2,
  barRadius = 4,
}: WaveformProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

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

    waveSurferRef.current = wavesurfer;
    wavesurfer.load(url);

    wavesurfer.on('ready', () => {
      console.log('Waveform ready:', url);
      console.log('Duration:', wavesurfer.getDuration());
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [url]);

  useEffect(() => {
    const wavesurfer = waveSurferRef.current;
    const audioEl = document.getElementById('global-audio') as HTMLMediaElement;

    if (isCurrent && wavesurfer && audioEl) {
      const updateProgress = () => {
        const currentTime = audioEl.currentTime;
        const duration = wavesurfer.getDuration();
        if (duration) {
          wavesurfer.seekTo(currentTime / duration);
        }
      };

      const handleTimeUpdate = () => updateProgress();

      audioEl.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }

    if (!isCurrent && wavesurfer) {
      wavesurfer.seekTo(0);
    }
  }, [isCurrent]);

  return <div ref={containerRef} className="waveform" />;
};

export default React.memo(Waveform, (prev, next) => {
  return prev.url === next.url && prev.isCurrent === next.isCurrent;
});
