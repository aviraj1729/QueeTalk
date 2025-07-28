import React, { useState } from "react";
import {
  FaFilePdf,
  FaFileWord,
  FaFileAlt,
  FaFileAudio,
  FaFileVideo,
} from "react-icons/fa";
import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;
import AudioPlayer from "./AudioPlayer";

interface Attachment {
  type: string;
  url: string;
  originalName?: string;
}

interface Props {
  attachments?: Attachment[];
}

const AttachmentRenderer: React.FC<Props> = ({ attachments = [] }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  if (!Array.isArray(attachments)) {
    console.error("Expected 'attachments' to be an array:", attachments);
    return null;
  }

  const imageAttachments = attachments.filter((att) =>
    att.type?.startsWith("image"),
  );
  const otherAttachments = attachments.filter(
    (att) => !att.type?.startsWith("image"),
  );

  return (
    <div className="space-y-2">
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {imageAttachments.slice(0, 4).map((img, idx) => (
            <div
              key={idx}
              className="relative cursor-pointer"
              onClick={() => setSelectedImageIndex(idx)}
            >
              <img
                src={img.url}
                alt={`attachment-${idx}`}
                className="object-cover w-full h-32"
              />
              {idx === 3 && imageAttachments.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
                  +{imageAttachments.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 📎 Other Attachments */}
      {otherAttachments.map((file, idx) => {
        const isPDF = file.type === "application/pdf";
        const isWord = file.type?.includes("word");
        const isAudio = file.type?.startsWith("audio");
        const isVideo = file.type?.startsWith("video");

        return (
          <div key={idx} className="py-1 rounded-md shadow-sm space-y-1">
            {isPDF ? (
              <Document
                file={file.url}
                loading="Loading preview..."
                error={<span>Unable to preview PDF</span>}
              >
                <Page pageNumber={1} width={200} />
              </Document>
            ) : isAudio ? (
              <>
                <AudioPlayer src={file.url} duration={file} />
              </>
            ) : isVideo ? (
              <div>
                <FaFileVideo className="text-pink-500 text-xl inline mr-2" />
                <span className="truncate">
                  {file.originalName || "Video File"}
                </span>
                <video controls className="mt-1 w-full max-h-60 rounded-md">
                  <source src={file.url} type={file.type} />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isWord ? (
                  <FaFileWord className="text-blue-500 text-2xl" />
                ) : isPDF ? (
                  <FaFilePdf className="text-red-500 text-2xl" />
                ) : (
                  <FaFileAlt className="text-gray-500 text-2xl" />
                )}
                <span className="truncate">{file.originalName || "File"}</span>
              </div>
            )}

            {/* <a */}
            {/*   href={file.url} */}
            {/*   target="_blank" */}
            {/*   rel="noopener noreferrer" */}
            {/*   className="text-blue-500 text-sm underline inline-block" */}
            {/*   download */}
            {/* > */}
            {/*   Download */}
            {/* </a> */}
          </div>
        );
      })}

      {/* 🔍 Image Preview Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedImageIndex(null)}
        >
          <img
            src={imageAttachments[selectedImageIndex].url}
            alt="Preview"
            className="max-w-[90%] max-h-[90%] object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default AttachmentRenderer;
