import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { audioEvents } from "./AudioEvents";

const TOTAL_BARS = 40;
const MAX_BAR_HEIGHT = 20;
const MIN_BAR_HEIGHT = 2;

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>();
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playerIdRef = useRef<string>(
    `player-${Math.random().toString(36).substr(2, 9)}`,
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  // Listen for pause events from other players
  useEffect(() => {
    const handlePauseAll = (event: CustomEvent) => {
      const currentPlayerId = event.detail?.playerId;
      // Only pause if this isn't the player that's starting to play
      if (currentPlayerId !== playerIdRef.current && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    audioEvents.addEventListener("pauseAll", handlePauseAll as EventListener);
    return () => {
      audioEvents.removeEventListener(
        "pauseAll",
        handlePauseAll as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(formatTime(audio.duration));
      } else {
        loadAudioBuffer(); // fallback to buffer decode
      }
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const currentProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(currentProgress);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [src]);

  const loadAudioBuffer = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer =
        await audioContextRef.current.decodeAudioData(arrayBuffer);

      audioBufferRef.current = audioBuffer;
      generateWaveformFromBuffer(audioBuffer);
      setDuration(formatTime(audioBuffer.duration));
    } catch (error) {
      console.error("Error loading audio buffer:", error);
      generateFallbackWaveform();
    }
  };

  const generateWaveformFromBuffer = (audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / TOTAL_BARS);
    const waveformPeaks: number[] = [];

    for (let i = 0; i < TOTAL_BARS; i++) {
      const start = i * samplesPerBar;
      const end = start + samplesPerBar;
      let max = 0;
      for (let j = start; j < end && j < channelData.length; j++) {
        const amplitude = Math.abs(channelData[j]);
        if (amplitude > max) max = amplitude;
      }
      waveformPeaks.push(max);
    }

    const maxPeak = Math.max(...waveformPeaks);
    const normalizedPeaks = waveformPeaks.map((peak) =>
      maxPeak > 0 ? peak / maxPeak : 0.1,
    );

    setPeaks(normalizedPeaks);
    drawWaveform(normalizedPeaks, 0);
  };

  const generateFallbackWaveform = () => {
    const fallbackPeaks = Array.from({ length: TOTAL_BARS }, (_, i) => {
      const wave1 = Math.sin(i * 0.15) * 0.4;
      const wave2 = Math.sin(i * 0.25) * 0.3;
      const wave3 = Math.sin(i * 0.08) * 0.2;
      const noise = (Math.random() - 0.5) * 0.3;
      const envelope = 0.3 + 0.7 * Math.sin((i / TOTAL_BARS) * Math.PI);

      let amplitude = (wave1 + wave2 + wave3 + noise) * envelope;
      amplitude = Math.max(0.1, Math.min(1, Math.abs(amplitude)));
      return amplitude;
    });

    setPeaks(fallbackPeaks);
    drawWaveform(fallbackPeaks, 0);
  };

  const setupAudioForPlayback = async () => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current =
        audioContextRef.current.createMediaElementSource(audio);

      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
    } catch (error) {
      console.error("Error setting up audio for playback:", error);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Pause all other players first (but not this one)
        const pauseEvent = new CustomEvent("pauseAll", {
          detail: { playerId: playerIdRef.current },
        });
        audioEvents.dispatchEvent(pauseEvent);

        if (!sourceRef.current) {
          await setupAudioForPlayback();
        }

        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
      setIsPlaying(false);
    }
  };

  const drawWaveform = (peaksData: number[], currentProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = (rect.width - (TOTAL_BARS - 1) * 1) / TOTAL_BARS;
    const progressPoint = (currentProgress / 100) * TOTAL_BARS;

    peaksData.forEach((peak, i) => {
      const height = MIN_BAR_HEIGHT + peak * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
      const x = i * (barWidth + 1);
      const y = (MAX_BAR_HEIGHT - height) / 2;
      const isPlayed = i < progressPoint;
      ctx.fillStyle = isPlayed ? "#555555" : "#959595";
      const radius = Math.min(barWidth / 2, 1);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, height, radius);
      ctx.fill();
    });
  };

  useEffect(() => {
    if (peaks.length > 0) {
      drawWaveform(peaks, progress);
    }
  }, [progress, peaks]);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas || !audio.duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickProgress = (x / rect.width) * 100;
    const newTime = (clickProgress / 100) * audio.duration;

    audio.currentTime = newTime;
    setProgress(clickProgress);
  };

  return (
    <div className="flex items-center gap-3 rounded-full sm:w-[300px] w-[200px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        crossOrigin="anonymous"
      />

      <button onClick={togglePlay} className="flex-shrink-0">
        {isPlaying ? (
          <Pause size={14} fill="white" />
        ) : (
          <Play size={14} fill="white" />
        )}
      </button>

      <div className="flex-1 h-5 flex items-center cursor-pointer">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ height: `${MAX_BAR_HEIGHT}px` }}
          onClick={handleWaveformClick}
        />
      </div>

      <span className="text-xs font-mono min-w-[35px] text-gray-300">
        {formatTime(currentTime)} / {duration}
      </span>
    </div>
  );
};

export default AudioPlayer;
