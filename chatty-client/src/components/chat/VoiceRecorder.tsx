// components/VoiceRecorder.tsx
import { useState, useRef, useEffect } from "react";
import { MdMicNone, MdPause, MdDelete, MdError } from "react-icons/md";
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check MediaRecorder support and get supported MIME type
  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "audio/webm"; // fallback
  };

  const startRecording = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported in this browser");
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Get supported MIME type
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder with supported format
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const audioFile = new File([audioBlob], "voice-message.webm", {
          type: mimeType,
        });

        chunksRef.current = [];

        try {
          setIsLoading(true);
          await sendMessage(chatId, "", [audioFile]);
          onSendRecording?.();
        } catch (err) {
          console.error("Failed to send voice message", err);
          setError("Failed to send voice message");
        } finally {
          setIsLoading(false);
        }

        // Clean up
        cleanup();
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording failed");
        cleanup();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Failed to start recording", err);
      setIsLoading(false);

      // Provide specific error messages
      if (err.name === "NotAllowedError") {
        setError(
          "Microphone access denied. Please allow microphone access and try again.",
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No microphone found. Please connect a microphone and try again.",
        );
      } else if (err.name === "NotSupportedError") {
        setError("Recording not supported in this browser.");
      } else {
        setError(err.message || "Failed to start recording");
      }

      cleanup();
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

  // Show error state
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400">
        <MdError className="w-5 h-5" />
        <span className="text-sm">{error}</span>
        <button
          onClick={() => setError(null)}
          className="text-gray-400 hover:text-white focus:outline-none transition-colors"
        >
          <MdMicNone className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-white rounded-full"></div>
        <span className="text-sm text-gray-400">Starting...</span>
      </div>
    );
  }

  if (!isRecording) {
    return (
      <button
        onClick={handleMicClick}
        className="text-gray-400 hover:text-white focus:outline-none transition-colors"
        title="Start recording"
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
        title={isPaused ? "Resume recording" : "Pause recording"}
      >
        <MdPause className="w-5 h-5" />
      </button>

      {/* Send button */}
      <button
        onClick={stopAndSendRecording}
        className="text-green-400 hover:text-green-300 focus:outline-none transition-colors px-2 py-1 rounded text-sm"
        title="Send recording"
      >
        Send
      </button>

      {/* Delete/Cancel button */}
      <button
        onClick={cancelRecording}
        className="text-red-400 hover:text-red-300 focus:outline-none transition-colors"
        title="Cancel recording"
      >
        <MdDelete className="w-5 h-5" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
