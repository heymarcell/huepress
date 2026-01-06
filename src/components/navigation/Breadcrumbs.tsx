import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {item.name}
              </span>
            ) : (
              <>
                <Link 
                  to={item.url} 
                  className="hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
