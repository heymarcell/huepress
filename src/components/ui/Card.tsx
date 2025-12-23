import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "flat" | "primary";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-white border border-gray-200 shadow-sm",
      hover: "bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
      flat: "bg-gray-50 border border-gray-100",
      primary: "bg-primary text-white border-transparent shadow-2xl shadow-primary/30",
    };

    return (
      <div
        ref={ref}
        className={`rounded-card overflow-hidden ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pb-3 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-serif text-xl font-semibold ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm mt-1 opacity-80 ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 mt-auto flex items-center ${className}`} {...props} />;
}
