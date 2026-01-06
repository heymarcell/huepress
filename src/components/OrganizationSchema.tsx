import { Helmet } from "react-helmet-async";

/**
 * Persistent Organization schema for entity establishment across all pages
 * Helps Google and AI models understand HuePress as an authoritative source
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://huepress.co/#organization",
    "name": "HuePress",
    "url": "https://huepress.co",
    "logo": {
      "@type": "ImageObject",
      "url": "https://huepress.co/logo.svg",
      "width": "180",
      "height": "180"
    },
    "description": "Therapy-grade printable coloring pages designed by licensed occupational therapists for children with autism, ADHD, sensory processing challenges, and fine motor delays.",
    "foundingDate": "2024",
    "sameAs": [
      "https://www.pinterest.com/huepress",
      "https://twitter.com/huepress"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@huepress.co",
      "availableLanguage": "English"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

/**
 * WebSite schema with search action for homepage
 */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://huepress.co/#website",
    "url": "https://huepress.co",
    "name": "HuePress",
    "description": "Therapy-grade coloring pages for kids and families",
    "publisher": {
      "@id": "https://huepress.co/#organization"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://huepress.co/vault?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
