import type { Container } from "@cloudflare/containers";

export type Bindings = {
  DB: D1Database;
  ASSETS_PRIVATE: R2Bucket;
  ASSETS_PUBLIC: R2Bucket;
  PROCESSING: DurableObjectNamespace<Container>; // Container for processing
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_ANNUAL: string;
  ENVIRONMENT: string;
  META_ACCESS_TOKEN: string;
  META_PIXEL_ID: string;
  ADMIN_EMAILS: string; // Comma-separated list of admin emails
  SITE_URL: string; // e.g., https://huepress.co
  ASSETS_CDN_URL: string; // e.g., https://assets.huepress.co
  PINTEREST_ACCESS_TOKEN: string;
  PINTEREST_AD_ACCOUNT_ID: string; // e.g., 549769812316
  GA4_API_SECRET: string;
  GA4_MEASUREMENT_ID: string; // e.g., G-XXXXXXXX
  INTERNAL_API_TOKEN: string; // Shared secret for internal container uploads
};

export interface Asset {
  id: string;
  asset_id?: string;  // Human-readable ID (HP-ANM-0001)
  slug?: string;      // URL-friendly slug (cozy-capybara)
  title: string;
  description: string;
  extended_description?: string;
  category: string;
  skill: string;
  image_url: string;
  r2_key_private: string;
  status: 'published' | 'draft';
  tags: string[];
  created_at: string;
  download_count: number;
  // SEO Content
  fun_facts?: string[];     // JSON array
  suggested_activities?: string[];  // JSON array
  coloring_tips?: string;
  therapeutic_benefits?: string;
  meta_keywords?: string;
}

export interface Tag {
  id: string;
  name: string;
  type: 'category' | 'theme' | 'age_group' | 'skill';
  slug: string;
  description?: string;
  display_order: number;
}

export interface User {
  id: string;
  email: string;
  clerk_id: string;
  subscription_status: string;
  stripe_customer_id?: string;
  subscription_id?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export interface Review {
  id: string;
  user_id: string;
  asset_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  user_email?: string;  // Joined from users table
}
