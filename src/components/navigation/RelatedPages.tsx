import { Link } from "react-router-dom";
import { Asset } from "@/api/types";
import { ChevronRight } from "lucide-react";

interface RelatedPagesProps {
  items: Asset[];
  title?: string;
  className?: string;
}

export function RelatedPages({ items, title = "You Might Also Like", className = "" }: RelatedPagesProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className={`${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-ink">{title}</h2>
        <Link 
          to="/vault" 
          className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const url = item.slug && item.asset_id 
            ? `/coloring-pages/${item.slug}-${item.asset_id}` 
            : `/vault/${item.id}`;

          return (
            <Link
              key={item.id}
              to={url}
              className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="aspect-square bg-gray-50 overflow-hidden">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm text-ink line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {item.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default RelatedPages;
