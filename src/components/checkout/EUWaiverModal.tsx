import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EUWaiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const EUWaiverModal: React.FC<EUWaiverModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading 
}) => {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200 border-2 border-ink">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-ink transition-colors"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h3 className="font-serif text-2xl text-ink mb-2">One Last Step</h3>
          <p className="text-gray-500 text-sm">
            Please confirm your consent for immediate digital delivery.
          </p>
        </div>

        {/* Checkbox Area */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
          <label 
            className="flex items-start gap-3 cursor-pointer group"
          >
            <button
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => setIsChecked(!isChecked)}
              className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                isChecked 
                  ? "bg-primary border-primary text-white" 
                  : "bg-white border-gray-300 text-transparent group-hover:border-primary"
              }`}
            >
              <CheckSquare size={14} className={isChecked ? "opacity-100" : "opacity-0"} />
            </button>
            <div className="text-sm text-gray-700 leading-relaxed select-none">
              <span className="font-medium text-ink block mb-1">I consent to immediate access.</span>
              By checking this box, I expressly consent to the immediate supply of the digital content and acknowledge that I thereby <strong>lose my right of withdrawal</strong> from the contract.
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onConfirm}
            disabled={!isChecked || isLoading}
            isLoading={isLoading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Confirm and Pay
          </Button>
          
          <p className="text-center text-xs text-gray-400">
            Secure checkout powered by Stripe.
            <br />
            See <Link to="/terms" className="underline hover:text-gray-600" target="_blank">Terms</Link> and <Link to="/privacy" className="underline hover:text-gray-600" target="_blank">Privacy</Link>.
          </p>
        </div>

      </div>
    </div>
  );
};
