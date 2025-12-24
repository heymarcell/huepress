export type Bindings = {
  DB: D1Database;
  ASSETS_PRIVATE: R2Bucket;
  ASSETS_PUBLIC: R2Bucket;
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
};

export interface Asset {
  id: string;
  title: string;
  description: string;
  category: string;
  skill: string;
  image_url: string;
  r2_key_private: string;
  status: 'published' | 'draft';
  tags: string[];
  created_at: string;
  download_count: number;
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
  details?: any;
}
