// components/VoiceRecorder.tsx
import { useState, useRef } from "react";
import { MdMicNone, MdStop } from "react-icons/md";
import { sendMessage } from "../../api";

const VoiceRecorder = ({ chatId }: { chatId: string }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        } catch (err) {
          console.error("Failed to send voice message", err);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    }
  };

  return (
    <button
      onClick={handleMicClick}
      className={`text-gray-400 hover:text-white focus:outline-none`}
    >
      {isRecording ? (
        <MdStop className="w-6 h-6" />
      ) : (
        <MdMicNone className="w-6 h-6" />
      )}
    </button>
  );
};

export default VoiceRecorder;
