import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/layout/AdminLayout";

// Eager load HomePage for fast FCP
import HomePage from "./pages/Home";

// Lazy load all other pages for code splitting
const VaultPage = lazy(() => import("./pages/Vault"));
const ResourceDetailPage = lazy(() => import("./pages/ResourceDetail"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const AboutPage = lazy(() => import("./pages/About"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminAssets = lazy(() => import("./pages/admin/Assets"));
const AdminAssetForm = lazy(() => import("./pages/admin/AssetForm"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));

import ScrollToTop from "./components/ScrollToTop";
import { ConsentProvider } from "./context/ConsentContext";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { ConsentPreferences } from "./components/privacy/ConsentPreferences";

// Loading fallback component - Sophisticated branded loader
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50">
      {/* Animated Logo/Icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary animate-pulse shadow-lg flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-white animate-bounce" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" 
            />
          </svg>
        </div>
        {/* Outer ring animation */}
        <div className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-primary/30 animate-ping" />
      </div>
      
      {/* Loading text */}
      <div className="text-center">
        <h3 className="font-serif text-xl text-ink mb-2">Loading</h3>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      
      {/* Subtle tagline */}
      <p className="mt-4 text-sm text-gray-400">Preparing your coloring experience...</p>
    </div>
  );
}

export default function App() {
  return (
    <ConsentProvider>
      <ScrollToTop />
      <ConsentBanner />
      <ConsentPreferences />
      <Suspense fallback={<PageLoader />}>
      <Routes>
      {/* Public routes */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="vault/:id" element={<ResourceDetailPage />} />
        <Route path="coloring-pages/:slug" element={<ResourceDetailPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="assets" element={<AdminAssets />} />
        <Route path="assets/new" element={<AdminAssetForm />} />
        <Route path="assets/:id/edit" element={<AdminAssetForm />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      </Routes>
      </Suspense>
    </ConsentProvider>
  );
}
