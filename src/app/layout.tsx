import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HuePress | Curated Coloring Pages for Modern Moms",
    template: "%s | HuePress",
  },
  description:
    "Therapy-grade, bold coloring pages curated for design-conscious parents and pediatric therapists. No ads, no clutter—just fridge-worthy art.",
  keywords: [
    "coloring pages",
    "bold and easy",
    "printable coloring",
    "therapy coloring pages",
    "kids activities",
    "fine motor activities",
  ],
  authors: [{ name: "HuePress" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://huepress.co",
    siteName: "HuePress",
    title: "HuePress | Curated Coloring Pages",
    description:
      "Bold, therapy-grade coloring pages for modern families. Curated, ad-free, and fridge-worthy.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HuePress - Curated Coloring Pages",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HuePress | Curated Coloring Pages",
    description:
      "Bold, therapy-grade coloring pages for modern families. Curated, ad-free, and fridge-worthy.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
