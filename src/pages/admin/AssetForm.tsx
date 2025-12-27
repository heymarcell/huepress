import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft, Eye, EyeOff, Sparkles, Code, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
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
  asset_id?: string;
}

// Rich Content Tab Type
type RichContentTab = "facts" | "activities" | "tips" | "seo";

export default function AdminAssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
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

  // JSON Import State
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Rich Content Tab State
  const [activeRichTab, setActiveRichTab] = useState<RichContentTab>("facts");

  // Fetch existing asset data when editing
  useEffect(() => {
    if (!isEditing || !id) return;
    
    const fetchAsset = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const asset = await apiClient.admin.getAsset(id, token);
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
            const previewLink = apiClient.assets.getDownloadUrl(asset.id as string);
            setPdfPreviewUrl(previewLink);
          }

          // Fetch Source SVG for Regeneration
          try {
            const sourceBlob = await apiClient.admin.getAssetSource(id, token);
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
  }, [id, isEditing, user, getToken]);

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


  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingFiles, setHasExistingFiles] = useState(false);
  const [isProcessingSvg, setIsProcessingSvg] = useState(false);

  
  // Store original SVG for potential regeneration
  const [originalSvgFile, setOriginalSvgFile] = useState<File | null>(null);
  const [_isNewSourceFile, setIsNewSourceFile] = useState(false);
  
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

  // JSON Import Handler
  const handleJsonImport = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Validate and apply fields
      const newFormData: Partial<AssetFormData> = {};
      
      if (parsed.title) newFormData.title = String(parsed.title);
      if (parsed.description) newFormData.description = String(parsed.description);
      if (parsed.category) newFormData.category = String(parsed.category);
      if (parsed.skill) newFormData.skill = String(parsed.skill);
      if (parsed.tags) newFormData.tags = String(parsed.tags);
      if (parsed.status && (parsed.status === "draft" || parsed.status === "published")) {
        newFormData.status = parsed.status;
      }
      if (parsed.extendedDescription) newFormData.extendedDescription = String(parsed.extendedDescription);
      if (parsed.funFacts) {
        newFormData.funFacts = Array.isArray(parsed.funFacts) 
          ? parsed.funFacts.join("\n") 
          : String(parsed.funFacts);
      }
      if (parsed.suggestedActivities) {
        newFormData.suggestedActivities = Array.isArray(parsed.suggestedActivities) 
          ? parsed.suggestedActivities.join("\n") 
          : String(parsed.suggestedActivities);
      }
      if (parsed.coloringTips) newFormData.coloringTips = String(parsed.coloringTips);
      if (parsed.therapeuticBenefits) newFormData.therapeuticBenefits = String(parsed.therapeuticBenefits);
      if (parsed.metaKeywords) newFormData.metaKeywords = String(parsed.metaKeywords);

      setFormData(prev => ({ ...prev, ...newFormData }));
      setJsonInput("");
      setIsJsonImportOpen(false);
      
      setAlertState({
        isOpen: true,
        title: "Import Successful",
        message: `Applied ${Object.keys(newFormData).length} fields from JSON.`,
        variant: "success"
      });
    } catch (err) {
      setJsonError("Invalid JSON. Please check your syntax.");
    }
  };

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
    setIsNewSourceFile(true);
    
    try {
      const token = await getToken();
      if (!token) throw new Error("No authenticated session found.");

      // 1. Create Draft Asset (saves all form data, returns ID & slug)
      const { assetId, slug } = await apiClient.admin.createDraft(
        { 
          title: formData.title, 
          description: formData.description, 
          category: formData.category, 
          skill: formData.skill, 
          tags: formData.tags 
        }, 
        token
      );
      
      if (!assetId || !slug) {
        throw new Error("Failed to create draft. Please try again.");
      }

      // 2. Setup Local State (Backend generates files)
      setFormData(prev => ({ ...prev, asset_id: assetId }));
      setPdfPreviewUrl(null);
      setThumbnailPreviewUrl(URL.createObjectURL(file)); // Use SVG as preview
      setHasExistingFiles(true);

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
      
      // Append Source File
      uploadForm.append("source", file);

      const uploadResult = await apiClient.admin.createAsset(uploadForm, token);
      
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setAlertState({
        isOpen: true,
        title: "Asset Created!",
        message: `Successfully created asset ${assetId}. You can now publish it or continue editing.`,
        variant: "success"
      });

    } catch (err) {
      console.error("SVG Auto-process failed", err);
      setAlertState({
        isOpen: true,
        title: "Magic Failed",
        message: "Could not process SVG. Please try again.",
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
      const token = await getToken();
      if (!token) throw new Error("No authenticated session found.");
      
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
      
      // Always append source if we have it
      if (originalSvgFile) {
        form.append("source", originalSvgFile);
      }
      
      const result = await apiClient.admin.createAsset(form, token);

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

  // Tab content config
  const richContentTabs: { id: RichContentTab; label: string; field: keyof AssetFormData; placeholder: string; rows: number }[] = [
    { id: "facts", label: "Fun Facts", field: "funFacts", placeholder: "One fact per line...\nCapybaras love water\nThey are social animals", rows: 5 },
    { id: "activities", label: "Activities", field: "suggestedActivities", placeholder: "One activity per line...\nCount the flowers\nColor the water blue", rows: 5 },
    { id: "tips", label: "Tips & Benefits", field: "coloringTips", placeholder: "Start with light colors...", rows: 4 },
    { id: "seo", label: "SEO", field: "metaKeywords", placeholder: "keyword1, keyword2, keyword3", rows: 2 },
  ];

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

      {/* JSON Quick Import Panel */}
      <div className="mb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsJsonImportOpen(!isJsonImportOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
              <Code className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-ink">Quick Import (JSON)</span>
              <span className="text-xs text-gray-500 block">Paste JSON data to auto-fill the form</span>
            </div>
          </div>
          {isJsonImportOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isJsonImportOpen && (
          <div className="px-6 pb-6 space-y-3 border-t border-gray-100">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={6}
              className="w-full mt-4 px-4 py-3 font-mono text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all bg-white"
              placeholder={`{\n  "title": "Friendly Capybara",\n  "description": "A cute capybara...",\n  "category": "Animals",\n  "skill": "Easy",\n  "tags": "cute, animal"\n}`}
            />
            {jsonError && (
              <p className="text-red-500 text-sm">{jsonError}</p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleJsonImport}
                disabled={!jsonInput.trim()}
              >
                Apply JSON
              </Button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          
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

            {/* Extended Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Extended Description</label>
              <textarea
                name="extendedDescription"
                value={formData.extendedDescription}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all"
                placeholder="Detailed story about the subject..."
              />
            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-6">
            <h2 className="font-serif text-xl text-ink font-bold">Organization</h2>

            <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Right Column: Sticky Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-24">
          
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-4">
            <h3 className="font-bold text-ink">Publishing</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: "draft", label: "Draft", icon: EyeOff, desc: "Only visible to you" },
                { val: "published", label: "Published", icon: Eye, desc: "Visible to everyone" }
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
                  <div className={`p-3 rounded-lg border-2 transition-all text-center ${
                    formData.status === option.val 
                      ? option.val === "draft" 
                        ? "border-yellow-400 bg-yellow-50" 
                        : "border-green-400 bg-green-50"
                      : "border-transparent bg-gray-50 hover:bg-gray-100"
                  }`}>
                    <option.icon className={`w-5 h-5 mx-auto mb-1 ${
                      formData.status === option.val 
                        ? option.val === "draft" ? "text-yellow-600" : "text-green-600"
                        : "text-gray-400"
                    }`} />
                    <span className={`block font-bold text-sm ${
                      formData.status === option.val ? "text-ink" : "text-gray-500"
                    }`}>{option.label}</span>
                    <span className="text-[10px] text-gray-400">{option.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Media Card - SVG Upload Only */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-4">
            <h3 className="font-bold text-ink">Media</h3>
            
            {/* Thumbnail Preview */}
            {thumbnailPreviewUrl && (
              <div 
                className="relative group w-full aspect-square bg-gray-50 rounded-lg border border-gray-100 overflow-hidden cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
              >
                <img 
                  src={thumbnailPreviewUrl} 
                  alt="Thumbnail Preview" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-xs px-2 py-1 rounded-full shadow-sm text-ink font-medium">Click to Zoom</span>
                </div>
              </div>
            )}

            {/* PDF Preview Link */}
            {pdfPreviewUrl && (
              <a 
                href={pdfPreviewUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors border border-teal-100"
              >
                <Eye className="w-4 h-4" />
                Preview PDF
              </a>
            )}

            {/* Regenerate OG Button */}
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const token = await getToken();
                    if (!token) throw new Error("No token");
                    setAlertState({
                      isOpen: true,
                      title: "Regenerating OG...",
                      message: "Requesting new OG image...",
                      variant: "info"
                    });
                    await apiClient.admin.regenerateOg(id!, token);
                    setAlertState({
                      isOpen: true,
                      title: "Success",
                      message: "OG Image regeneration started. Please wait a few seconds.",
                      variant: "success"
                    });
                  } catch (e) {
                    setAlertState({
                      isOpen: true,
                      title: "Error",
                      message: "Failed to regenerate OG image",
                      variant: "error"
                    });
                  }
                }}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate OG Preview
              </Button>
            )}

            {/* Master SVG Upload (Magic) */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-xl border border-primary/10">
              <label className="flex items-center gap-2 text-sm font-bold text-ink mb-1">
                <Sparkles className="w-4 h-4 text-primary" /> Magic Upload (SVG)
              </label>
              <p className="text-xs text-gray-500 mb-3">Upload an SVG to auto-generate PDF and Thumbnail</p>
              
              {/* Warning for existing assets without source */}
              {isEditing && !originalSvgFile && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <div className="mt-0.5 text-amber-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Source Missing</p>
                    <p className="text-[10px] text-amber-700">Upload the SVG to enable regeneration.</p>
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
                  className={`flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-all group ${
                     isDragging 
                     ? "border-primary bg-primary/10" 
                     : "border-primary/30 bg-white/50 hover:border-primary hover:bg-white/80"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg transition-transform ${isDragging ? "scale-110" : "group-hover:scale-110"}`}>
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-ink text-center">
                    {isProcessingSvg ? "Processing..." : (isDragging ? "Drop SVG here!" : "Upload or Drop SVG")}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Rich Content Card with Tabs */}
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-6 space-y-4">
            <h3 className="font-bold text-ink">Rich Content</h3>
            
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              {richContentTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveRichTab(tab.id)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeRichTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="pt-2">
              {activeRichTab === "facts" && (
                <textarea
                  name="funFacts"
                  value={formData.funFacts}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all text-sm"
                  placeholder="One fact per line...&#10;Capybaras love water&#10;They are social animals"
                />
              )}
              {activeRichTab === "activities" && (
                <textarea
                  name="suggestedActivities"
                  value={formData.suggestedActivities}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all text-sm"
                  placeholder="One activity per line...&#10;Count the flowers&#10;Color the water blue"
                />
              )}
              {activeRichTab === "tips" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coloring Tips</label>
                    <textarea
                      name="coloringTips"
                      value={formData.coloringTips}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all text-sm"
                      placeholder="Start with light colors..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Therapeutic Benefits</label>
                    <textarea
                      name="therapeuticBenefits"
                      value={formData.therapeuticBenefits}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all text-sm"
                      placeholder="Helps develop focus..."
                    />
                  </div>
                </div>
              )}
              {activeRichTab === "seo" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    name="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-sm"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              )}
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

      {/* Thumbnail Zoom Modal */}
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
