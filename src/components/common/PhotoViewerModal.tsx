import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string | null;
  userName?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  userName,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !photoUrl) return null;

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image container */}
      <div className="relative max-w-lg w-full flex flex-col items-center gap-4">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10 max-h-[80vh] flex items-center justify-center bg-black/50">
          <img
            src={photoUrl}
            alt={userName ? `${userName}'s profile photo` : 'Profile Photo'}
            className="w-full max-h-[75vh] object-contain rounded-2xl"
          />
        </div>
        {userName && (
          <p className="text-white/80 text-sm font-medium tracking-wide">
            {userName}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};
