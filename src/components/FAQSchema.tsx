import { Helmet } from "react-helmet-async";

/**
 * FAQ Schema for About and Pricing pages
 * Helps Google display FAQ rich results in search
 */

export const AboutFAQSchema = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Who creates HuePress coloring pages?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "HuePress coloring pages are designed or reviewed by licensed pediatric occupational therapists with 10+ years of combined experience in sensory integration therapy, fine motor skill development, and therapeutic art interventions."
        }
      },
      {
        "@type": "Question",
        "name": "What makes HuePress pages therapy-grade?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our pages feature bold, thick lines (3-5mm stroke width) specifically designed for children with fine motor challenges, autism spectrum disorder, or ADHD. Each page is reviewed by licensed occupational therapists to ensure it supports developmental goals like hand-eye coordination, focus, and sensory regulation."
        }
      },
      {
        "@type": "Question",
        "name": "Are HuePress pages suitable for children with autism?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Our Bold and Easy skill levels are specifically designed for children with autism, featuring high-contrast, low-clutter designs to reduce sensory overwhelm, predictable symmetrical patterns, and large sections that are easier to color within."
        }
      },
      {
        "@type": "Question",
        "name": "Can occupational therapists use HuePress in clinical settings?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Many pediatric OTs use HuePress pages in therapy sessions. HuePress Club membership includes a Therapist License allowing use with clients. We also offer bulk licensing for clinics and schools."
        }
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};

export const PricingFAQSchema = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much does HuePress Club cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "HuePress Club costs $5 per month and gives you unlimited downloads of all 500+ therapy-grade coloring pages. You can cancel anytime with one click."
        }
      },
      {
        "@type": "Question",
        "name": "Can I try HuePress for free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! We offer 3 free sample coloring pages with no credit card required. Just enter your email and get an instant download link."
        }
      },
      {
        "@type": "Question",
        "name": "What's included in HuePress Club?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "HuePress Club includes unlimited downloads of 500+ coloring pages, new designs every Sunday, vector PDF files for crisp printing, no watermarks or ads, and the ability to cancel anytime."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel my subscription?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can cancel your HuePress Club subscription at any time with one click from your account settings. There are no cancellation fees or commitments."
        }
      },
      {
        "@type": "Question",
        "name": "Do you offer bulk licensing for schools or clinics?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, we offer institutional bulk licensing for schools, clinics, and therapy centers. Contact support@huepress.co for custom pricing and volume discounts."
        }
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};
