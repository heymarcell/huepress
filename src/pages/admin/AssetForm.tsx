import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";

import { Tag } from "@/api/types";

// Helper to parse comma-separated tags
const parseTags = (tags: string) => tags.split(",").map(t => t.trim()).filter(Boolean);


interface AssetFormData {
  title: string;
  description: string;
  category: string;
  skill: string;
  tags: string;
  status: "draft" | "published";
  // SEO Fields
  extendedDescription: string;
  funFacts: string; // Newline separated
  suggestedActivities: string; // Newline separated
  coloringTips: string;
  therapeuticBenefits: string;
  metaKeywords: string;
}

export default function AdminAssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [availableTags, setAvailableTags] = useState<Record<string, Tag[]>>({});
  
  const [formData, setFormData] = useState<AssetFormData>({
    title: "",
    description: "",
    category: "", // Will be set after loading tags
    skill: "",
    tags: "",
    status: "draft",
    extendedDescription: "",
    funFacts: "",
    suggestedActivities: "",
    coloringTips: "",
    therapeuticBenefits: "",
    metaKeywords: "",
  });

  // Fetch Tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await apiClient.tags.list();
        setAvailableTags(data.grouped);
        
        // Set defaults if empty
        setFormData(prev => ({
          ...prev,
          category: prev.category || data.grouped.category?.[0]?.name || "",
          skill: prev.skill || data.grouped.skill?.[0]?.name || ""
        }));
      } catch (err) {
        console.error("Failed to load tags", err);
      }
    };
    fetchTags();
  }, []);


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
      // Basic Fields
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("skill", formData.skill);
      form.append("tags", formData.tags);
      form.append("status", formData.status);
      
      // SEO Fields
      form.append("extended_description", formData.extendedDescription);
      form.append("coloring_tips", formData.coloringTips);
      form.append("therapeutic_benefits", formData.therapeuticBenefits);
      form.append("meta_keywords", formData.metaKeywords);
      
      // JSON Arrays (split by newline)
      const factsArray = formData.funFacts.split("\n").map(s => s.trim()).filter(Boolean);
      const activitiesArray = formData.suggestedActivities.split("\n").map(s => s.trim()).filter(Boolean);
      
      form.append("fun_facts", JSON.stringify(factsArray));
      form.append("suggested_activities", JSON.stringify(activitiesArray));

      form.append("thumbnail", thumbnailFile);
      form.append("pdf", pdfFile);

      // Use production API URL if in prod, else local
      // apiClient handles API_URL internally, but createAsset needs manualFormData
      
      const result = await apiClient.admin.createAsset(form, user?.primaryEmailAddress?.emailAddress || "");


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
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-8">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white"
              >
                <option value="">Select Category</option>
                {(availableTags.category || []).map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Skill Level *</label>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white"
              >
                <option value="">Select Skill</option>
                {(availableTags.skill || []).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Extended SEO Content */}
          <div className="border-t border-gray-100 pt-6 space-y-6">
            <h3 className="font-serif text-h3 text-ink">Rich Content & SEO</h3>
            
            {/* Extended Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Extended Description (About This Design)</label>
              <textarea
                name="extendedDescription"
                value={formData.extendedDescription}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                placeholder="Detailed story about the subject..."
              />
            </div>

            {/* Fun Facts & Activities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Fun Facts (One per line)</label>
                <textarea
                  name="funFacts"
                  value={formData.funFacts}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  placeholder="Capybaras love water&#10;They are social animals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Suggested Activities (One per line)</label>
                <textarea
                  name="suggestedActivities"
                  value={formData.suggestedActivities}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  placeholder="Count the spots&#10;Color the background green"
                />
              </div>
            </div>

            {/* Tips & Benefits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Coloring Tips</label>
                <textarea
                  name="coloringTips"
                  value={formData.coloringTips}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  placeholder="Start with light colors..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Therapeutic Benefits</label>
                <textarea
                  name="therapeuticBenefits"
                  value={formData.therapeuticBenefits}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                  placeholder="Helps develop focus..."
                />
              </div>
            </div>
            
            {/* Meta Keywords */}
             <div>
              <label className="block text-sm font-medium text-ink mb-2">Meta Keywords</label>
              <input
                type="text"
                name="metaKeywords"
                value={formData.metaKeywords}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>

          {/* Tags Selection */}
          <div className="space-y-4">
             <label className="block text-sm font-medium text-ink">Tags & Themes</label>
             
             {/* Themes */}
             {availableTags.theme && availableTags.theme.length > 0 && (
               <div className="bg-gray-50 p-4 rounded-lg">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">Themes</span>
                 <div className="flex flex-wrap gap-2">
                   {availableTags.theme.map(tag => {
                     const isSelected = parseTags(formData.tags).includes(tag.name);
                     return (
                       <button
                         type="button"
                         key={tag.id}
                         onClick={() => {
                           const current = parseTags(formData.tags);
                           const newTags = isSelected 
                             ? current.filter(t => t !== tag.name)
                             : [...current, tag.name];
                           setFormData(prev => ({ ...prev, tags: newTags.join(", ") }));
                         }}
                         className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                           isSelected 
                             ? "bg-secondary text-white border-secondary" 
                             : "bg-white text-gray-600 border-gray-200 hover:border-secondary/30"
                         }`}
                       >
                         {tag.name}
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}

             {/* Age Groups */}
             {availableTags.age_group && availableTags.age_group.length > 0 && (
               <div className="bg-gray-50 p-4 rounded-lg">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">Age Groups</span>
                 <div className="flex flex-wrap gap-2">
                   {availableTags.age_group.map(tag => {
                     const isSelected = parseTags(formData.tags).includes(tag.name);
                     return (
                       <button
                         type="button"
                         key={tag.id}
                         onClick={() => {
                           const current = parseTags(formData.tags);
                           const newTags = isSelected 
                             ? current.filter(t => t !== tag.name)
                             : [...current, tag.name];
                           setFormData(prev => ({ ...prev, tags: newTags.join(", ") }));
                         }}
                         className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                           isSelected 
                             ? "bg-primary text-white border-primary" 
                             : "bg-white text-gray-600 border-gray-200 hover:border-primary/30"
                         }`}
                       >
                         {tag.name}
                       </button>
                     );
                   })}
                 </div>
               </div>
             )}

             {/* Custom Tags Input */}
             <div>
               <label className="block text-xs font-medium text-gray-500 mb-2">Additional Tags (comma separated)</label>
               <input
                 type="text"
                 name="tags"
                 value={formData.tags}
                 onChange={handleChange}
                 className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                 placeholder="cat, garden, sunshine..."
               />
               <p className="text-xs text-gray-400 mt-1">
                  Selected themes and age groups are automatically added here.
               </p>
             </div>
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
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
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
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
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
            <label className="block text-sm font-medium text-ink mb-3">Status</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="relative cursor-pointer group">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === "draft"}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 peer-checked:border-yellow-400 peer-checked:bg-yellow-50 transition-all hover:border-gray-300">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-4 h-4 rounded-full border border-gray-300 peer-checked:border-yellow-500 peer-checked:bg-yellow-500" />
                    <span className="font-bold text-ink">Draft</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-7">Only visible to you</p>
                </div>
              </label>
              
              <label className="relative cursor-pointer group">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === "published"}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="p-4 rounded-lg border-2 border-gray-200 peer-checked:border-green-500 peer-checked:bg-green-50 transition-all hover:border-gray-300">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-4 h-4 rounded-full border border-gray-300 peer-checked:border-green-500 peer-checked:bg-green-500" />
                    <span className="font-bold text-ink">Published</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-7">Visible to everyone</p>
                </div>
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
