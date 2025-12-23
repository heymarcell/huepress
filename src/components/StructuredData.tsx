import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
  type: "WebSite" | "Organization" | "Product" | "Article";
  data: Record<string, any>;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
