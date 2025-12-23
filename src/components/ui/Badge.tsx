import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "soft" | "soft-success";
  size?: "sm" | "md";
}

export function Badge({ 
  variant = "default", 
  size = "md", 
  className = "", 
  children, 
  ...props 
}: BadgeProps) {
  const variants = {
    default: "bg-primary text-white border-transparent",
    secondary: "bg-secondary text-white border-transparent",
    outline: "text-ink border-ink",
    destructive: "bg-red-500 text-white border-transparent",
    success: "bg-success text-white border-transparent",
    warning: "bg-yellow-400 text-ink border-transparent",
    soft: "bg-gray-100 text-gray-800 border-transparent",
    "soft-success": "bg-success/10 text-success-dark border-transparent", 
    // Added specific soft-success for the home page badge
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5 h-5",
    md: "text-xs px-2.5 py-0.5 h-6",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
