// Fixed VoiceRecorder.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MdMicNone, MdPause, MdDelete, MdError } from "react-icons/md";
import { sendMessage } from "../../api";

interface VoiceRecorderProps {
  chatId: string;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSendRecording?: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  chatId,
  onRecordingStateChange,
  onSendRecording,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef(false); // <-- Add this line

  // Stable callback refs to prevent re-renders
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);
  const onSendRecordingRef = useRef(onSendRecording);

  // Update refs when props change
  useEffect(() => {
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingStateChange]);

  useEffect(() => {
    onSendRecordingRef.current = onSendRecording;
  }, [onSendRecording]);

  // Timer effect for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // Notify parent about recording state changes
  useEffect(() => {
    onRecordingStateChangeRef.current?.(isRecording);
  }, [isRecording]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Listen for custom send recording event
  useEffect(() => {
    const handleSendEvent = () => {
      if (isRecording) {
        stopAndSendRecording();
      }
    };

    document.addEventListener("sendRecording", handleSendEvent);
    return () => {
      document.removeEventListener("sendRecording", handleSendEvent);
    };
  }, [isRecording]);

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
        console.log("Using MIME type:", type);
        return type;
      }
    }
    console.log("Using fallback MIME type: audio/webm");
    return "audio/webm";
  };

  // Get file extension based on MIME type
  const getFileExtension = (mimeType: string) => {
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const cleanup = useCallback(() => {
    console.log("Cleaning up VoiceRecorder resources");

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("Stopping track:", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    mediaRecorderRef.current = null;
    isCancelledRef.current = false;
    chunksRef.current = [];

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setIsLoading(true);
      isCancelledRef.current = false;
      chunksRef.current = []; // Reset chunks

      console.log("Starting recording...");

      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported in this browser");
      }

      // Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (advancedError: any) {
        console.warn(
          "Advanced audio constraints failed, trying basic:",
          advancedError,
        );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      streamRef.current = stream;
      console.log("Microphone stream obtained");

      // Get supported MIME type
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (mimeError: any) {
        console.warn(
          "Failed to create MediaRecorder with MIME type, using default:",
          mimeError,
        );
        mediaRecorder = new MediaRecorder(stream);
      }

      // Set up event handlers
      mediaRecorder.ondataavailable = (e) => {
        console.log("Data available, size:", e.data.size);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log("MediaRecorder stopped");
        console.log("Chunks collected:", chunksRef.current.length);
        console.log("Is cancelled:", isCancelledRef.current);

        if (isCancelledRef.current || chunksRef.current.length === 0) {
          console.log("Recording was cancelled or no data");
          cleanup();
          return;
        }

        const finalMimeType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(chunksRef.current, { type: finalMimeType });
        const extension = getFileExtension(finalMimeType);
        const audioFile = new File([audioBlob], `voice-message.${extension}`, {
          type: finalMimeType,
        });

        console.log("Audio file created:", {
          size: audioFile.size,
          type: audioFile.type,
          name: audioFile.name,
        });

        try {
          setIsLoading(true);
          console.log("Sending voice message...");
          await sendMessage(chatId, "", [audioFile]);
          console.log("Voice message sent successfully");
          onSendRecordingRef.current?.();
        } catch (err: any) {
          console.error("Failed to send voice message", err);
          setError("Failed to send voice message");
        } finally {
          setIsLoading(false);
          cleanup();
        }
      };

      mediaRecorder.onerror = (e: any) => {
        console.error("MediaRecorder error:", e);
        setError(`Recording failed: ${e.error?.message || "Unknown error"}`);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;

      // Verify recording started
      setTimeout(() => {
        if (mediaRecorder.state === "inactive") {
          console.error("MediaRecorder stopped immediately after start");
          setError(
            "Recording stopped unexpectedly. Please check microphone permissions.",
          );
          cleanup();
          return;
        }
        console.log("MediaRecorder state after 100ms:", mediaRecorder.state);
      }, 100);

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
      } else if (err.name === "NotReadableError") {
        setError("Microphone is already in use by another application.");
      } else if (err.name === "OverconstrainedError") {
        setError("Microphone doesn't support the required settings.");
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
      console.log("Pausing recording");
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "paused"
    ) {
      console.log("Resuming recording");
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopAndSendRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log("Stopping recording to send");
      isCancelledRef.current = false;
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      console.log("Cancelling recording");
      isCancelledRef.current = true;
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
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
      console.log("VoiceRecorder unmounting");
      // Don't cleanup if actively recording - let it finish naturally
      if (mediaRecorderRef.current?.state === "recording") {
        console.log("Recording in progress, letting it complete");
        return;
      }
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
        <span className="text-sm text-gray-400">
          {isRecording ? "Sending..." : "Starting..."}
        </span>
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
