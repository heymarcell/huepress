import { HTMLAttributes, ElementType } from "react";

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  variant?: "display" | "h1" | "h2" | "h3" | "h4";
  className?: string;
}

export function Heading({ 
  as: Component = "h2", 
  variant, 
  className = "", 
  children, 
  ...props 
}: HeadingProps) {
  
  const variants: Record<string, string> = {
    display: "font-serif text-display font-semibold tracking-tight",
    h1: "font-serif text-h1 font-semibold tracking-tight",
    h2: "font-serif text-h2 font-semibold",
    h3: "font-serif text-h3 font-semibold",
    h4: "font-serif text-body font-bold",
  };

  // Map tags to default variants if not specified
  const defaultVariants: Record<string, string> = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h3", // Fallback
    h5: "h3", // Fallback
    h6: "h3", // Fallback
  };
  
  const selectedVariant = variant || defaultVariants[Component] || "h2";

  return (
    <Component 
      className={`${variants[selectedVariant]} ${className}`} 
      {...props}
    >
      {children}
    </Component>
  );
}

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  as?: ElementType;
  variant?: "body" | "small" | "large" | "muted";
  className?: string;
}

export function Text({ 
  as: Component = "p", 
  variant = "body", 
  className = "", 
  children, 
  ...props 
}: TextProps) {
  const variants = {
    body: "text-body", // Removed text-gray-600 to allow inheritance, relying on body default or custom classes
    large: "text-lg",
    small: "text-small",
    muted: "text-sm text-gray-400",
  };

  const defaultColors = {
    body: "text-gray-600",
    large: "text-gray-500",
    small: "text-gray-500",
    muted: "",
  };

  // If className contains a text- color, we might want to skip the default color.
  // But strictly, Tailwind classes later in the string override earlier ones.
  // The issue is if text-gray-600 has higher specificity or order issues.
  // Let's just append the default color IF the user hasn't provided one? 
  // No, that's complex. Let's trust Tailwind's cascade.
  // But wait, in the previous file I saw `text-ink` hardcoded.
  // Ideally, I should put the default color IN the variant string, but if I want to override it, 
  // passing `text-white` should work if it appears LATER.
  
  const baseClass = variants[variant];
  const colorClass = defaultColors[variant as keyof typeof defaultColors];
  
  return (
    <Component 
      className={`${baseClass} ${colorClass} ${className}`} 
      {...props}
    >
      {children}
    </Component>
  );
}
