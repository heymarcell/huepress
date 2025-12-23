import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const categories = ["Animals", "Fantasy", "Nature", "Vehicles", "Food", "Holidays", "Characters"];
const skills = ["Easy", "Medium", "Hard"];

interface AssetFormData {
  title: string;
  description: string;
  category: string;
  skill: string;
  tags: string;
  status: "draft" | "published";
}

export default function AdminAssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<AssetFormData>({
    title: "",
    description: "",
    category: categories[0],
    skill: skills[0],
    tags: "",
    status: "draft",
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const { user } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailFile || !pdfFile) {
      setAlertState({
        isOpen: true,
        title: "Missing Files",
        message: "Please upload both a thumbnail image and a PDF file.",
        variant: "error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value as string);
      });
      form.append("thumbnail", thumbnailFile);
      form.append("pdf", pdfFile);

      // Use production API URL if in prod, else local
      const API_URL = import.meta.env.VITE_API_URL || "";
      
      const response = await fetch(`${API_URL}/api/admin/assets`, {
        method: "POST",
        headers: {
          "X-Admin-Email": user?.primaryEmailAddress?.emailAddress || "",
        },
        body: form,
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Failed to create asset");
      }

      const result = await response.json();
      console.log("Asset created:", result);

      navigate("/admin/assets");
    } catch (error) {
      console.error("Error saving asset:", error);
      setAlertState({
        isOpen: true,
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Failed to save asset. Please try again.",
        variant: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link to="/admin/assets" className="flex items-center gap-2 text-gray-500 hover:text-ink mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </Link>
        <h1 className="font-serif text-h2 text-ink">
          {isEditing ? "Edit Asset" : "Add New Asset"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
              placeholder="e.g., Friendly Capybara in Flower Garden"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
              placeholder="A cute capybara surrounded by beautiful flowers..."
            />
          </div>

          {/* Category & Skill */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Skill Level *</label>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white"
              >
                {skills.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
              placeholder="capybara, flowers, cute, relaxing (comma-separated)"
            />
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Thumbnail (PNG/JPG) *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {thumbnailFile ? thumbnailFile.name : "Choose file..."}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">PDF File *</label>
              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {pdfFile ? pdfFile.name : "Choose file..."}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === "draft"}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === "published"}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm">Published</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex gap-4">
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            <Save className="w-4 h-4" />
            {isEditing ? "Update Asset" : "Create Asset"}
          </Button>
          <Link to="/admin/assets">
            <Button type="button" variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </div>
  );
}
