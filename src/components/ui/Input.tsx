import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={id} 
            className="block text-xs font-bold text-gray-700 mb-1 ml-1"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            w-full h-12 px-4 bg-white border rounded-md 
            focus:ring-2 outline-none text-ink placeholder:text-gray-400 
            transition-all duration-200
            ${error 
              ? "border-error focus:border-error focus:ring-error/10" 
              : "border-gray-200 focus:border-secondary focus:ring-secondary/10"
            }
            ${className}
          `}
          {...props}
        />
        {helperText && !error && (
          <p className="text-[10px] text-gray-500 mt-1 ml-1">{helperText}</p>
        )}
        {error && (
          <p className="text-xs text-error font-medium flex items-center gap-1 mt-1 ml-1 animate-fade-in">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

