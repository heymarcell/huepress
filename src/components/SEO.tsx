import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
}

const defaults = {
  title: "HuePress | Curated Coloring Pages for Modern Moms",
  description: "Therapy-grade, bold coloring pages curated for design-conscious parents and pediatric therapists. No ads, no clutter—just fridge-worthy art.",
  image: "/og-image.png",
  url: "https://huepress.co",
  type: "website" as const,
};

export function SEO({ 
  title = defaults.title, 
  description = defaults.description,
  image = defaults.image,
  url = defaults.url,
  type = defaults.type,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    setMeta("description", description);
    
    // Open Graph
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", image, true);
    setMeta("og:url", url, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", "HuePress", true);
    
    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

  }, [title, description, image, url, type]);

  return null;
}

export default SEO;
