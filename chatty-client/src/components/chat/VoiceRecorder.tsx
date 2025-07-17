// components/VoiceRecorder.tsx
import { useState, useRef, useEffect } from "react";
import { MdMicNone, MdPause, MdDelete } from "react-icons/md";
import { sendMessage } from "../../api";

interface VoiceRecorderProps {
  chatId: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSendRecording?: () => void;
}

const VoiceRecorder = ({
  chatId,
  onRecordingStateChange,
  onSendRecording,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer effect for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Notify parent about recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", {
          type: "audio/webm",
        });

        chunksRef.current = [];

        try {
          await sendMessage(chatId, "", [audioFile]);
          onSendRecording?.();
        } catch (err) {
          console.error("Failed to send voice message", err);
        }

        // Clean up
        cleanup();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const pauseRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      chunksRef.current = []; // Clear chunks to prevent sending
    }
    cleanup();
  };

  const cleanup = () => {
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    mediaRecorderRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMicClick = async () => {
    if (!isRecording) {
      await startRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  if (!isRecording) {
    return (
      <button
        onClick={handleMicClick}
        className="text-gray-400 hover:text-white focus:outline-none transition-colors"
      >
        <MdMicNone className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-full px-3 py-2">
      {/* Audio pulse animation */}
      <div className="flex items-center gap-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-green-500 rounded-full transition-all duration-300 ${
              !isPaused ? "animate-pulse" : ""
            }`}
            style={{
              height: !isPaused ? `${Math.random() * 16 + 8}px` : "8px",
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Recording time */}
      <span className="text-white text-sm font-mono">
        {formatTime(recordingTime)}
      </span>

      {/* Pause/Resume button */}
      <button
        onClick={handleMicClick}
        className="text-gray-400 hover:text-white focus:outline-none transition-colors"
      >
        <MdPause className="w-5 h-5" />
      </button>

      {/* Delete/Cancel button */}
      <button
        onClick={cancelRecording}
        className="text-red-400 hover:text-red-300 focus:outline-none transition-colors"
      >
        <MdDelete className="w-5 h-5" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
