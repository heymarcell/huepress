import { HTMLAttributes, forwardRef } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  container?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  background?: "default" | "muted" | "brand" | "accent";
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ 
    className = "", 
    children, 
    container = true, 
    size = "xl", 
    background = "default",
    ...props 
  }, ref) => {
    
    const backgrounds = {
      default: "bg-white",
      muted: "bg-gray-50",
      brand: "bg-primary text-white",
      accent: "bg-accent",
    };

    const containerSizes = {
      sm: "max-w-3xl",
      md: "max-w-5xl",
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      full: "max-w-full",
    };

    return (
      <section 
        ref={ref}
        className={`py-16 lg:py-24 ${backgrounds[background]} ${className}`}
        {...props}
      >
        {container ? (
          <div className={`${containerSizes[size]} mx-auto px-4 sm:px-6 lg:px-8 h-full`}>
            {children}
          </div>
        ) : (
          children
        )}
      </section>
    );
  }
);

Section.displayName = "Section";
