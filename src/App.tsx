import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./components/layout/AdminLayout";
import HomePage from "./pages/Home";
import VaultPage from "./pages/Vault";
import ResourceDetailPage from "./pages/ResourceDetail";
import PricingPage from "./pages/Pricing";
import AboutPage from "./pages/About";
import NotFoundPage from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAssets from "./pages/admin/Assets";
import AdminAssetForm from "./pages/admin/AssetForm";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="vault/:id" element={<ResourceDetailPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="about" element={<AboutPage />} />
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
  );
}
