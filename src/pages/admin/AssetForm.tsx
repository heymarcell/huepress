import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";

import { Tag } from "@/api/types";

// Removed client-side PDF generation imports

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
  asset_id?: string;
}

export default function AdminAssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
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

  // Fetch existing asset data when editing
  useEffect(() => {
    if (!isEditing || !id) return;
    
    const fetchAsset = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress || "";
        const asset = await apiClient.admin.getAsset(id, email);
        if (asset) {
          setFormData({
            title: (asset.title as string) || "",
            description: (asset.description as string) || "",
            category: (asset.category as string) || "",
            skill: (asset.skill as string) || "",
            tags: Array.isArray(asset.tags) ? (asset.tags as string[]).join(", ") : "",
            status: (asset.status as "draft" | "published") || "draft",
            extendedDescription: (asset.extended_description as string) || "",
            funFacts: Array.isArray(asset.fun_facts) ? (asset.fun_facts as string[]).join("\n") : "",
            suggestedActivities: Array.isArray(asset.suggested_activities) ? (asset.suggested_activities as string[]).join("\n") : "",
            coloringTips: (asset.coloring_tips as string) || "",
            therapeuticBenefits: (asset.therapeutic_benefits as string) || "",
            metaKeywords: (asset.meta_keywords as string) || "",
            asset_id: (asset.asset_id as string) || "",
          });
          // Set preview URLs if available
          if (asset.r2_key_public && !(asset.r2_key_public as string).startsWith("__draft__")) {
            setThumbnailPreviewUrl(`https://assets.huepress.co/${asset.r2_key_public}`);
            setHasExistingFiles(true);
          }
          if (asset.r2_key_private && !(asset.r2_key_private as string).startsWith("__draft__")) {
            // Use the public API download URL for preview if authenticated
            // Or just a placeholder if we can't get a direct link. 
            // Better: use the apiClient to get a signed URL or worker URL
            const previewLink = apiClient.assets.getDownloadUrl(asset.id as string);
            setPdfPreviewUrl(previewLink);
          }

          // Fetch Source SVG for Regeneration
          try {
            const sourceBlob = await apiClient.admin.getAssetSource(id, email);
            if (sourceBlob) {
              const sourceFile = new File([sourceBlob], "original.svg", { type: "image/svg+xml" });
              setOriginalSvgFile(sourceFile);
            } else {
               console.warn("No source file found for this asset.");
            }
          } catch (e) {
             console.warn("Could not fetch source SVG", e);
          }
        }
      } catch (err) {
        console.error("Failed to load asset", err);
      }
    };
    fetchAsset();
  }, [id, isEditing, user]);

  // Fetch Tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await apiClient.tags.list();
        setAvailableTags(data.grouped);
        
        // Set defaults if empty (only for new assets)
        if (!isEditing) {
          setFormData(prev => ({
            ...prev,
            category: prev.category || data.grouped.category?.[0]?.name || "",
            skill: prev.skill || data.grouped.skill?.[0]?.name || ""
          }));
        }
      } catch (err) {
        console.error("Failed to load tags", err);
      }
    };
    fetchTags();
  }, [isEditing]);


  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false); // Zoom state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingFiles, setHasExistingFiles] = useState(false); // Track if editing asset has files
  const [isProcessingSvg, setIsProcessingSvg] = useState(false);

  
  // Store original SVG for potential regeneration
  const [originalSvgFile, setOriginalSvgFile] = useState<File | null>(null);
  const [_isNewSourceFile, setIsNewSourceFile] = useState(false); // Track if source was just uploaded (needs upload)
  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(pdfPreviewUrl);
      if (thumbnailPreviewUrl && thumbnailPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [pdfPreviewUrl, thumbnailPreviewUrl]);

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

  // Auto-Regeneration Effect removed - Backend handles PDF generation and Thumbnail only depends on SVG content




  /* 
   * Helper: Generate PDF and WebP from SVG file
   * Reusable for initial upload and regeneration
   */
  /* 
   * Helper: Generate WebP Thumbnail from SVG file
   * (PDF generation is handled by the server)
   */


  /* 
   * Unified file processor that creates PDF and Thumbnail 
   * Accepted from: File Input OR Drop Zone
   */
  const processSvgFile = async (file: File) => {
    if (!file) return;

    // 0. Enforce Prerequisites for Correct ID/Metadata
    if (!formData.title || !formData.category || !formData.description || !formData.skill || !formData.tags) {
      setAlertState({
        isOpen: true,
        title: "Missing Info",
        message: "Please enter a Title, Description, Category, Skill Level, and Tags first so we can generate the correct Asset ID and Metadata.",
        variant: "info"
      });
      return;
    }

    setIsProcessingSvg(true);
    
    // Store SVG for potential regeneration if fields change
    setOriginalSvgFile(file);
    setIsNewSourceFile(true); // Mark as new for upload
    
    try {
      // 1. Create Draft Asset (saves all form data, returns ID & slug)
      const { assetId, slug } = await apiClient.admin.createDraft(
        { 
          title: formData.title, 
          description: formData.description, 
          category: formData.category, 
          skill: formData.skill, 
          tags: formData.tags 
        }, 
        user?.primaryEmailAddress?.emailAddress || ""
      );
      
      if (!assetId || !slug) {
        throw new Error("Failed to create draft. Please try again.");
      }

      // 2. Setup Local State (Backend generates files)
      setFormData(prev => ({ ...prev, asset_id: assetId }));
      setPdfFile(null); 
      setThumbnailFile(null);
      setPdfPreviewUrl(null);
      setThumbnailPreviewUrl(URL.createObjectURL(file)); // Use SVG as preview
      setHasExistingFiles(true); // Files are being created on backend

      // 3. IMMEDIATE UPLOAD - Upload files to backend and finalize draft
      setAlertState({
        isOpen: true,
        title: "Uploading...",
        message: "Saving files to cloud storage...",
        variant: "info"
      });

      const uploadForm = new FormData();
      uploadForm.append("asset_id", assetId);
      uploadForm.append("title", formData.title);
      uploadForm.append("description", formData.description);
      uploadForm.append("category", formData.category);
      uploadForm.append("skill", formData.skill);
      uploadForm.append("tags", formData.tags);
      uploadForm.append("status", "draft"); 
      uploadForm.append("extended_description", formData.extendedDescription);
      uploadForm.append("coloring_tips", formData.coloringTips);
      uploadForm.append("therapeutic_benefits", formData.therapeuticBenefits);
      uploadForm.append("meta_keywords", formData.metaKeywords);
      
      const factsArray = formData.funFacts.split("\n").map((s: string) => s.trim()).filter(Boolean);
      const activitiesArray = formData.suggestedActivities.split("\n").map((s: string) => s.trim()).filter(Boolean);
      uploadForm.append("fun_facts", JSON.stringify(factsArray));
      uploadForm.append("suggested_activities", JSON.stringify(activitiesArray));
      
      // Do not append "thumbnail" (backend generates from source)
      // Append Source File
      uploadForm.append("source", file);

      const uploadResult = await apiClient.admin.createAsset(uploadForm, user?.primaryEmailAddress?.emailAddress || "");
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setAlertState({
        isOpen: true,
        title: "Asset Created! ✨",
        message: `Successfully created asset ${assetId}. You can now publish it or continue editing.`,
        variant: "success"
      });

    } catch (err) {
      console.error("SVG Auto-process failed", err);
      setAlertState({
        isOpen: true,
        title: "Magic Failed",
        message: "Could not process SVG. Please upload files manually.",
        variant: "error"
      });
    } finally {
      setIsProcessingSvg(false);
    }
  };

  // Wrapper for input change
  const handleSvgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       processSvgFile(file);
       e.target.value = ""; // Clear input to allow re-selection
    }
  };

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "image/svg+xml") {
      processSvgFile(file);
    } else if (file) {
      setAlertState({
        isOpen: true,
        title: "Invalid File",
        message: "Please upload a valid SVG file.",
        variant: "error"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require files for new assets if we don't have them
    const requiresSource = !hasExistingFiles;
    
    // Check if we have a source file (SVG) - either newly uploaded or previously existing
    // If requiresSource is true, we MUST have originalSvgFile
    if (requiresSource && !originalSvgFile) {
      setAlertState({
        isOpen: true,
        title: "Missing Files",
        message: "Please upload an SVG file.",
        variant: "error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentThumbnail = thumbnailFile;
      const currentPdf = pdfFile;
      
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
      
      if (formData.asset_id) {
         form.append("asset_id", formData.asset_id);
      }
      
      // JSON Arrays (split by newline)
      const factsArray = formData.funFacts.split("\n").map(s => s.trim()).filter(Boolean);
      const activitiesArray = formData.suggestedActivities.split("\n").map(s => s.trim()).filter(Boolean);
      
      form.append("fun_facts", JSON.stringify(factsArray));
      form.append("suggested_activities", JSON.stringify(activitiesArray));

      // Only append files if they exist (new uploads or regenerated)
      if (currentThumbnail) {
        form.append("thumbnail", currentThumbnail);
      }
      // If manual PDF provided, append it to override auto-generation
      if (currentPdf) {
        form.append("pdf", currentPdf);
      }
      
      // Always append source if we have it (ensures background tasks have content for generation)
      // This is critical for regeneration logic when clicking "Save"
      if (originalSvgFile) {
        form.append("source", originalSvgFile);
      }

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/admin/assets" className="flex items-center gap-2 text-gray-500 hover:text-ink mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </Link>
          <h1 className="font-serif text-h2 text-ink">
            {isEditing ? "Edit Asset" : "Add New Asset"}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/assets">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} variant="primary" isLoading={isSubmitting}>
            <Save className="w-4 h-4" />
            {isEditing ? "Update" : "Save Asset"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Info Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-6">
            <h2 className="font-serif text-xl text-ink font-bold">Basic Information</h2>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                placeholder="e.g., Friendly Capybara in Flower Garden"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                placeholder="A cute capybara surrounded by beautiful flowers..."
              />
            </div>
          </div>

          {/* Rich Content Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-6">
            <h2 className="font-serif text-xl text-ink font-bold">Rich Content & SEO</h2>
            
            {/* Extended Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Extended Description</label>
              <textarea
                name="extendedDescription"
                value={formData.extendedDescription}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                placeholder="Detailed story about the subject..."
              />
            </div>

            {/* Fun Facts & Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Fun Facts (One per line)</label>
                <textarea
                  name="funFacts"
                  value={formData.funFacts}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Capybaras love water&#10;They are social animals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Suggested Activities (One per line)</label>
                <textarea
                  name="suggestedActivities"
                  value={formData.suggestedActivities}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Count the spots&#10;Color the background green"
                />
              </div>
            </div>

            {/* Tips & Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Coloring Tips</label>
                <textarea
                  name="coloringTips"
                  value={formData.coloringTips}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                  placeholder="Start with light colors..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">Therapeutic Benefits</label>
                <textarea
                  name="therapeuticBenefits"
                  value={formData.therapeuticBenefits}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Sidebar */}
        <div className="space-y-6 sticky top-24">
          
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-4">
            <h3 className="font-bold text-ink">Publishing</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { val: "draft", label: "Draft", icon: EyeOff, color: "yellow" },
                { val: "published", label: "Published", icon: Eye, color: "green" }
              ].map((option) => (
                <label key={option.val} className="relative cursor-pointer group">
                  <input
                    type="radio"
                    name="status"
                    value={option.val}
                    checked={formData.status === option.val}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    formData.status === option.val 
                      ? `border-${option.color}-400 bg-${option.color}-50` 
                      : "border-transparent bg-gray-50 hover:bg-gray-100"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                       formData.status === option.val 
                        ? `bg-${option.color}-200 text-${option.color}-800` 
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      <option.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${
                        formData.status === option.val ? "text-ink" : "text-gray-500"
                      }`}>{option.label}</span>
                      <span className="text-xs text-gray-400">
                        {option.val === "draft" ? "Only visible to you" : "Visible to everyone"}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-6">
            <h3 className="font-bold text-ink">Organization</h3>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white transition-all"
              >
                <option value="">Select Category</option>
                {(availableTags.category || []).map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Skill Level *</label>
              <select
                name="skill"
                value={formData.skill}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none bg-white transition-all"
              >
                <option value="">Select Skill</option>
                {(availableTags.skill || []).map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Tags Input */}
            <div>
               <label className="block text-sm font-medium text-ink mb-2">Tags *</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                  placeholder="cat, garden, sunshine..."
                />
                 {/* Theme Clouds */}
                 {availableTags.theme && (
                   <div className="mt-3 flex flex-wrap gap-1.5">
                     {availableTags.theme.slice(0, 8).map(tag => (
                       <button
                         type="button"
                         key={tag.id}
                         onClick={() => {
                            const current = parseTags(formData.tags);
                            if (!current.includes(tag.name)) {
                              setFormData(prev => ({ ...prev, tags: [...current, tag.name].join(", ") }));
                            }
                         }}
                         className="px-2 py-1 text-[10px] uppercase font-bold bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                       >
                         {tag.name}
                       </button>
                     ))}
                   </div>
                 )}
            </div>
          </div>

          {/* Media Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-6">
            <h3 className="font-bold text-ink">Media</h3>
            
            {/* Master SVG Upload (Magic) */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-xl border border-primary/10">
              <label className="block text-sm font-bold text-ink mb-1">✨ Magic Upload (SVG)</label>
              <p className="text-xs text-gray-500 mb-3">Upload an SVG to automatically generate the PDF and Thumbnail.</p>
              
              {/* Warning for existing assets without source */}
              {isEditing && !originalSvgFile && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <div className="mt-0.5 text-amber-500">
                    <AlertModal isOpen={false} onClose={() => {}} title="" message="" variant="error" /> {/* Dummy to import type if needed, or just use icon */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Source Missing</p>
                    <p className="text-[10px] text-amber-700">Live regeneration is disabled. Please upload the original SVG to enable auto-updates.</p>
                  </div>
                </div>
              )}

              <div 
                className={`relative transition-all ${isDragging ? 'scale-[1.02]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/svg+xml"
                  onChange={handleSvgChange}
                  className="hidden"
                  id="svg-upload"
                />
                <label
                  htmlFor="svg-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all group ${
                     isDragging 
                     ? "border-primary bg-primary/10" 
                     : "border-primary/30 bg-white/50 hover:border-primary hover:bg-white/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg transition-transform ${isDragging ? "scale-110" : "group-hover:scale-110"}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-ink text-center">
                    {isProcessingSvg ? "Generating files..." : (isDragging ? "Drop SVG here!" : "Upload or Drop Master SVG")}
                  </span>
                </label>
              </div>
            </div>

            <div className="my-4 border-t border-gray-100 flex items-center gap-2">
               <span className="text-xs text-gray-400 bg-white px-2 -mt-2.5">OR Manual Upload</span>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Thumbnail</label>
              
              {/* Thumbnail Preview */}
              {thumbnailPreviewUrl && (
                <>
                  <div 
                    className="mb-3 relative group w-32 h-32 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden mx-auto cursor-zoom-in"
                    onClick={() => setIsZoomOpen(true)}
                  >
                    <img 
                      src={thumbnailPreviewUrl} 
                      alt="Thumbnail Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm text-ink font-medium">Zoom</span>
                    </div>
                  </div>
                  
                  {/* Zoom Modal is rendered at root level for proper z-index */}
                </>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setThumbnailFile(file);
                    if (file) {
                      setThumbnailPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setThumbnailPreviewUrl(null);
                    }
                  }}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label
                  htmlFor="thumbnail-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    thumbnailFile ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <Upload className={`w-4 h-4 ${thumbnailFile ? "text-primary" : "text-gray-400"}`} />
                  <span className={`text-xs ${thumbnailFile ? "text-primary font-medium" : "text-gray-500"}`}>
                    {thumbnailFile ? thumbnailFile.name : "Upload Image"}
                  </span>
                </label>
              </div>
            </div>

            {/* PDF */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">PDF File</label>
              
              {/* Preview Button if PDF exists */}
              {pdfPreviewUrl && (
                <div className="mb-3">
                   <a 
                     href={pdfPreviewUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex items-center justify-center gap-2 w-full py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors border border-teal-100"
                   >
                     <Eye className="w-4 h-4" />
                     Preview Generated PDF
                   </a>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPdfFile(file);
                    if (file) {
                      setPdfPreviewUrl(URL.createObjectURL(file));
                    } else {
                      setPdfPreviewUrl(null);
                    }
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    pdfFile ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  <Upload className={`w-4 h-4 ${pdfFile ? "text-teal-500" : "text-gray-400"}`} />
                  <span className={`text-xs ${pdfFile ? "text-teal-700 font-medium" : "text-gray-500"}`}>
                    {pdfFile ? pdfFile.name : "Upload PDF"}
                  </span>
                </label>
              </div>
            </div>
          </div>

        </div>
      </form>

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />

      {/* Thumbnail Zoom Modal - rendered at root level */}
      {isZoomOpen && thumbnailPreviewUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-8 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <img 
            src={thumbnailPreviewUrl} 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            alt="Zoomed Thumbnail"
          />
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light"
            onClick={() => setIsZoomOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
