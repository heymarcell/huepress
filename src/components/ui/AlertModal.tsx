import { X } from 'lucide-react';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
}

export function AlertModal({ isOpen, onClose, title, message, variant = 'info', confirmText, onConfirm }: AlertModalProps) {
  if (!isOpen) return null;

  const isConfirmMode = Boolean(onConfirm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 border border-gray-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-ink transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className={`font-serif text-2xl mb-2 ${variant === 'error' ? 'text-red-600' : 'text-ink'}`}>
            {title}
          </h3>
          <p className="text-gray-500 text-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        {isConfirmMode ? (
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              variant={variant === 'error' ? 'primary' : 'primary'}
              size="lg"
              className={`flex-1 ${variant === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {confirmText || 'Confirm'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={onClose}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Okay
          </Button>
        )}
      </div>
    </div>
  );
}
