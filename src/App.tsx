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

import ScrollToTop from "./components/ScrollToTop";
import { ConsentProvider } from "./context/ConsentContext";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { ConsentPreferences } from "./components/privacy/ConsentPreferences";

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading...</div>
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
      </Route>
      </Routes>
      </Suspense>
    </ConsentProvider>
  );
}
