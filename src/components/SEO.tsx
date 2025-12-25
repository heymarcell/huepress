import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonical?: string;
  type?: "website" | "article" | "product"; // Added product
  keywords?: string; // Added keywords
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
  canonical,
  type = defaults.type,
  keywords,
}: SEOProps) {
  const fullTitle = title === defaults.title ? title : `${title} | HuePress`;
  // Ensure absolute URL for image if it starts with /
  const fullImage = image 
    ? (image.startsWith('http') ? image : `https://huepress.co${image}`)
    : `https://huepress.co${defaults.image}`;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical || url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content="HuePress" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content="@huepress" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  );
}

export default SEO;
