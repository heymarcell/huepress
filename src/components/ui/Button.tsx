import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles with consistent animations for all buttons
    const baseStyles = `
      inline-flex items-center justify-center gap-2 
      font-sans font-bold 
      rounded-md
      transition-all duration-300 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      disabled:opacity-50 disabled:cursor-not-allowed
      hover:scale-[1.02]
      active:scale-[0.97]
      hover:shadow-lg
    `;

    // Variant styles - outline uses inset box-shadow for consistent sizing
    const variants = {
      primary: `
        bg-primary text-white 
        hover:bg-primary-hover hover:shadow-primary/25
        focus:ring-primary
      `,
      secondary: `
        bg-secondary text-white 
        hover:bg-secondary-hover hover:shadow-secondary/25
        focus:ring-secondary
      `,
      outline: `
        bg-white text-ink 
        border border-gray-200
        hover:bg-gray-50 hover:text-ink hover:border-gray-300
        focus:ring-gray-200
      `,
      ghost: `
        bg-transparent text-ink 
        hover:bg-gray-100 hover:shadow-none
        focus:ring-gray-400
      `,
    };

    // Fixed heights for consistent sizing across all button variants
    // sm: 40px, md: 48px, lg: 56px
    const sizes = {
      sm: "h-10 px-4 text-sm",
      md: "h-12 px-6 text-button",
      lg: "h-14 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
