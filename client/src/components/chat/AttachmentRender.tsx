import React, { useState, useRef, useEffect } from "react";
import { Expand, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FaFilePdf } from "react-icons/fa6";
import { Document, Page, pdfjs } from "react-pdf";
import AudioPlayer from "./AudioPlayer";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;

interface Attachment {
  type: string;
  url: string;
  originalName?: string;
  duration?: string | number;
  size?: string;
  pages?: number;
  fileSize?: number; // Add this for better size handling
}

interface Props {
  attachments?: Attachment[];
}

const AttachmentRenderer: React.FC<Props> = ({ attachments = [] }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [imageGridExpanded, setImageGridExpanded] = useState(false);
  const [pdfPageCounts, setPdfPageCounts] = useState<Record<string, number>>(
    {},
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

  const formatSize = (size: string) => {
    if (size < 1000) {
      return `${size} b`;
    } else if (size < 1000000) {
      return `${(size / 1000).toFixed(2)} kb`;
    } else if (size < 1000000) {
      return `${(size / 1000000).toFixed(2)} mb`;
    }
  };

  // Image Modal Component
  const ImageModal = () => {
    if (!imageGridExpanded) return null;

    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <button
          onClick={() => setImageGridExpanded(false)}
          className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors z-10"
        >
          <X size={32} />
        </button>

        {selectedImageIndex !== null && (
          <>
            <button
              onClick={() =>
                setSelectedImageIndex(
                  selectedImageIndex > 0
                    ? selectedImageIndex - 1
                    : imageAttachments.length - 1,
                )
              }
              className="absolute left-6 text-white/80 hover:text-white transition-colors z-10"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={() =>
                setSelectedImageIndex(
                  selectedImageIndex < imageAttachments.length - 1
                    ? selectedImageIndex + 1
                    : 0,
                )
              }
              className="absolute right-16 text-white/80 hover:text-white transition-colors z-10"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        <div className="max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-8">
          {selectedImageIndex !== null ? (
            <img
              src={imageAttachments[selectedImageIndex].url}
              alt={`Expanded view ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {imageAttachments.map((img, index) => (
                <img
                  key={index}
                  src={img.url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-6 left-1/2 flex gap-2">
          {imageAttachments.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                selectedImageIndex === index ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {imageAttachments.length > 0 && (
        <div
          className={`grid ${imageAttachments.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-2 relative`}
        >
          {imageAttachments.slice(0, 4).map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.url}
                alt={`Image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg cursor-pointer"
                onClick={() => {
                  setSelectedImageIndex(index);
                  setImageGridExpanded(true);
                }}
              />
              {index === 3 && imageAttachments.length > 4 && (
                <div className="absolute inset-0 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  +{imageAttachments.length - 4}
                </div>
              )}
              {index === imageAttachments.length - 1 &&
                imageAttachments.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(null);
                      setImageGridExpanded(true);
                    }}
                    className="absolute top-2 right-2 bg-black/40 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Expand className="text-white" size={16} />
                  </button>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Other Attachments */}
      {otherAttachments.map((file, idx) => {
        const isPDF = file.type === "document" || file.type?.includes("pdf");
        const isWord =
          file.type?.includes("word") || file.originalName?.endsWith(".docx");
        const isAudio = file.type?.startsWith("audio");
        const isVideo = file.type?.startsWith("video");

        return (
          <div key={idx} className="space-y-2">
            {isPDF && (
              <div className="rounded-xl">
                <div className="bg-white/95 h-[100px] rounded-lg overflow-hidden">
                  <Document
                    file={file.url}
                    onLoadSuccess={({ numPages }) => {
                      setPdfPageCounts((prev) => ({
                        ...prev,
                        [file.url]: numPages,
                      }));
                    }}
                    loading={
                      <div className="p-6 text-center text-gray-600">
                        Loading preview...
                      </div>
                    }
                    error={
                      <div className="p-6 text-center text-gray-600">
                        Unable to preview PDF
                      </div>
                    }
                  >
                    <Page
                      pageNumber={1}
                      width={300}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <FaFilePdf className="text-white" size={24} />
                  <div className="flex-1">
                    <p className="font-medium text-white max-w-lg">
                      {(file.originalName.length > 20
                        ? `${file.originalName?.substring(0, 30)}.....`
                        : file.originalName) || "Document.pdf"}
                    </p>
                    <p className="text-xs text-white/70">
                      {formatSize(file.size) || "Unknown size"} •{" "}
                      {pdfPageCounts[file.url] || file.pages || "Unknown"} pages
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAudio && <AudioPlayer src={file.url} duration={file} />}

            {isVideo && (
              <div className="relative rounded-xl overflow-hidden">
                <video
                  className="w-full h-48 object-cover cursor-pointer"
                  controls
                  preload="metadata"
                >
                  <source src={file.url} type={file.type} />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {(isWord || (!isPDF && !isAudio && !isVideo)) && (
              <div className="flex items-center gap-3 rounded-xl">
                <div
                  className={`rounded-lg p-3 flex-shrink-0 ${
                    isWord ? "bg-blue-500" : "bg-gray-500"
                  }`}
                >
                  <FileText className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {file.originalName || "Document"}
                  </p>
                  <p className="text-xs text-white/70">
                    {file.size || "Unknown size"} • {isWord ? "DOC" : "FILE"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Image Modal */}
      <ImageModal />
    </div>
  );
};

export default AttachmentRenderer;
