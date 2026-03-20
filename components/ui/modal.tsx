'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
}

const Modal = ({ 
  title, 
  isOpen, 
  onClose, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnClickOutside = true
}: ModalProps) => {
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] w-full'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className={`
          ${sizeClasses[size]} 
          w-full 
          bg-white dark:bg-zinc-900 
          rounded-xl shadow-2xl 
          border border-zinc-200 dark:border-zinc-800
          animate-in zoom-in-95 slide-in-from-bottom-4 duration-200
          flex flex-col max-h-[90vh]
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200 group"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Optional footer slot - you can add this if needed */}
        {/* <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button>Confirm</Button>
        </div> */}
      </div>
    </div>
  );
};

export default Modal;