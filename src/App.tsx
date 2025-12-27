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

const RequestDesignPage = lazy(() => import("./pages/RequestDesign"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminAssets = lazy(() => import("./pages/admin/Assets"));
const AdminAssetForm = lazy(() => import("./pages/admin/AssetForm"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminDesignRequests = lazy(() => import("./pages/admin/DesignRequests"));
const AdminBlogList = lazy(() => import("./pages/admin/BlogList"));
const AdminBlogEditor = lazy(() => import("./pages/admin/BlogEditor"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const SettingsPage = lazy(() => import("./pages/Settings"));

// Public Blog pages
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

import ScrollToTop from "./components/ScrollToTop";
import { ConsentProvider } from "./context/ConsentContext";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { ConsentPreferences } from "./components/privacy/ConsentPreferences";
import { Toaster } from "sonner";

// Loading fallback component - Clean, subtle loader
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Simple spinner */}
      <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
      <p className="mt-4 text-sm text-gray-400">Loading...</p>
    </div>
  );
}

const OnboardingPage = lazy(() => import("./pages/Onboarding"));
import { RequireOnboarding } from "./components/auth/RequireOnboarding";

export default function App() {
  return (
    <ConsentProvider>
      <ScrollToTop />
      <ConsentBanner />
      <ConsentPreferences />
      <Suspense fallback={<PageLoader />}>
      <Routes>
      
      {/* Onboarding - Standalone */}
      <Route path="onboarding" element={<OnboardingPage />} />

      {/* Public routes */}
      <Route element={
        <RequireOnboarding>
          <Layout />
        </RequireOnboarding>
      }>
        <Route index element={<HomePage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="vault/:id" element={<ResourceDetailPage />} />
        <Route path="coloring-pages/:slug" element={<ResourceDetailPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="request-design" element={<RequestDesignPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="blog" element={<BlogIndex />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="admin" element={
        <RequireOnboarding>
          <AdminLayout />
        </RequireOnboarding>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="assets" element={<AdminAssets />} />
        <Route path="assets/new" element={<AdminAssetForm />} />
        <Route path="assets/:id/edit" element={<AdminAssetForm />} />
        <Route path="requests" element={<AdminDesignRequests />} />
        <Route path="blog" element={<AdminBlogList />} />
        <Route path="blog/new" element={<AdminBlogEditor />} />
        <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      </Routes>
      </Suspense>
      <Toaster position="bottom-center" />
    </ConsentProvider>
  );
}
