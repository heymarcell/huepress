import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  canonical?: string;
  type?: "website" | "article" | "product";
  keywords?: string;
  robots?: string; // Control indexing (e.g., "index,follow", "noindex,nofollow")
  noindex?: boolean; // Quick way to prevent indexing
  breadcrumbs?: Array<{ name: string; url: string }>; // For breadcrumb schema
}

const defaults = {
  title: "HuePress | Curated Coloring Pages for Modern Moms",
  description:
    "Therapy-grade, bold coloring pages curated for design-conscious parents and pediatric therapists. No ads, no clutter. Just fridge-worthy art.",
  image: "/og-image.webp",
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
  robots,
  noindex = false,
  breadcrumbs,
}: SEOProps) {
  const fullTitle = title === defaults.title ? title : `${title} | HuePress`;
  // Ensure absolute URL for image if it starts with /
  const fullImage = image
    ? (image.startsWith('http') ? image : `https://huepress.co${image}`)
    : `https://huepress.co${defaults.image}`;

  // Determine robots directive
  const robotsContent = noindex
    ? "noindex,nofollow"
    : (robots || "index,follow");

  // Generate breadcrumb schema if provided
  const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  } : null;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content="#FFFAF9" />
      <meta
        name="keywords"
        content={
          keywords ||
          "Bold coloring pages, Simple coloring pages for autism, Fine motor skills coloring, Occupational therapy coloring pages, Distraction-free coloring, thick line coloring pages, sensory friendly coloring pages, printable autism resources"
        }
      />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonical || url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content={title || "HuePress Coloring Page"}
      />
      <meta property="og:site_name" content="HuePress" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:domain" content="huepress.co" />
      <meta name="twitter:creator" content="@huepress" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Breadcrumb Schema */}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
    </Helmet>
  );
}

export default SEO;
