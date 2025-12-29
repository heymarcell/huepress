import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft, Eye, EyeOff, Sparkles, Code, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
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
          if (asset.r2_key_og) {
            setOgPreviewUrl(`https://assets.huepress.co/${asset.r2_key_og}`);
          }
          if (asset.r2_key_private && !(asset.r2_key_private as string).startsWith("__draft__")) {
            try {
              const blob = await apiClient.assets.fetchDownloadBlob(asset.id as string, token);
              setPdfPreviewUrl(URL.createObjectURL(blob));
            } catch (e) {
              console.error("Failed to load PDF preview", e);
            }
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
             console.error("DEBUG: Could not fetch source SVG. Possible reasons: Key missing, file missing in R2, or CORS.", e);
             // Verify if we have a key?
             // We can't easily check the key here without another call, but the error helps.
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
  const [ogPreviewUrl, setOgPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingFiles, setHasExistingFiles] = useState(false);
  const [isProcessingSvg, setIsProcessingSvg] = useState(false);

  // Processing status polling
  const [processingStatus, setProcessingStatus] = useState<{
    hasActiveJob: boolean;
    job: {
      id: string;
      status: string;
      jobType: string;
      errorMessage: string | null;
      createdAt: string;
      startedAt: string | null;
      completedAt: string | null;
    } | null;
    files: {
      thumbnail: boolean;
      pdf: boolean;
      og: boolean;
    };
  } | null>(null);

  
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

  // Poll processing status when editing
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    if (!isEditing || !id) return;

    const fetchStatus = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const status = await apiClient.admin.getProcessingStatus(id, token);
        setProcessingStatus(status);

        // If files just became ready, refresh the preview URLs
        if (status.files.thumbnail && !thumbnailPreviewUrl?.includes('assets.huepress.co')) {
          setThumbnailPreviewUrl(`https://assets.huepress.co/thumbnails/${id}.webp?t=${Date.now()}`);
        }
        if (status.files.og && !ogPreviewUrl?.includes('assets.huepress.co')) {
          setOgPreviewUrl(`https://assets.huepress.co/og-images/${id}.png?t=${Date.now()}`);
        }
        if (status.files.pdf && !pdfPreviewUrl) {
          try {
             // Only fetch if we don't have it yet (or it was cleared)
             const blob = await apiClient.assets.fetchDownloadBlob(id, token);
             setPdfPreviewUrl(URL.createObjectURL(blob));
          } catch (e) {
             console.error("Failed to fetch new PDF", e);
          }
        }

        // Stop polling if no active job
        if (!status.hasActiveJob && pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } catch (err) {
        console.error('Failed to fetch processing status:', err);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds while there might be an active job
    pollingIntervalRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isEditing, id, getToken, thumbnailPreviewUrl, ogPreviewUrl, pdfPreviewUrl]);

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
    } catch (_err) {
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

      // SKIP PROCESSING for this auto-save (prevents double generation job)
      // The job will be triggered only on explicit "Save" click
      uploadForm.append("skip_processing", "true");

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

      // Invalidate cache so assets list shows updated data
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });

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
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/assets" 
              className="p-2 -ml-2 text-gray-400 hover:text-ink hover:bg-gray-100 rounded-full transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <h1 className="font-serif text-xl font-bold text-ink">
              {isEditing ? "Edit Asset" : "New Asset"}
            </h1>
            {isEditing && (
               <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                 {id}
               </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/assets" tabIndex={-1}>
              <Button type="button" variant="ghost" className="text-gray-500">
                Cancel
              </Button>
            </Link>
            
            {isEditing && (
               <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:flex"
                  onClick={async () => {
                    try {
                      const token = await getToken();
                      if (!token) throw new Error("No token");
                      setAlertState({
                        isOpen: true,
                        title: "Regenerating All...",
                        message: "Requesting full regeneration (Thumbnail, OG, PDF)...",
                        variant: "info"
                      });
                      
                      await apiClient.admin.bulkRegenerate([id!], token);
                      
                      setAlertState({
                        isOpen: true,
                        title: "Success",
                        message: "Regeneration started. Updates will appear shortly.",
                        variant: "success"
                      });
                    } catch (_e) {
                      setAlertState({
                        isOpen: true,
                        title: "Error",
                        message: "Failed to start regeneration",
                        variant: "error"
                      });
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  Regenerate
                </Button>
            )}
            
            <Button 
              onClick={handleSubmit} 
              variant="primary" 
              isLoading={isSubmitting}
              className="shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {isEditing ? "Save Changes" : "Create Asset"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Fields (Inputs) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* JSON Quick Import Panel */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <button
                type="button"
                onClick={() => setIsJsonImportOpen(!isJsonImportOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Code className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-ink text-sm">Quick Import (JSON)</span>
                    <span className="text-xs text-gray-500 block">Paste JSON data to auto-fill</span>
                  </div>
                </div>
                {isJsonImportOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {isJsonImportOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100 bg-gray-50/50">
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={6}
                    className="flex-1 min-h-[120px] p-3 rounded-lg border border-line bg-surface-subtle text-ink placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black resize-none text-sm transition-shadow bg-white"
                    placeholder={`{\n  "title": "Friendly Capybara",\n  "description": "...",\n  "category": "Animals",\n  "skill": "Easy",\n  "tags": "cute, animal"\n}`}
                  />
                  {jsonError && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {jsonError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleJsonImport}
                      disabled={!jsonInput.trim()}
                      className="text-xs h-8"
                    >
                      Apply JSON
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-8 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-primary rounded-full"></div>
                <h2 className="font-serif text-lg text-ink font-bold">Basic Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-ink placeholder:text-gray-400"
                    placeholder="e.g., Friendly Capybara in Flower Garden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all text-sm leading-relaxed"
                    placeholder="A cute capybara surrounded by beautiful flowers..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Extended Description</label>
                  <textarea
                    name="extendedDescription"
                    value={formData.extendedDescription}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all text-sm leading-relaxed"
                    placeholder="Detailed story about the subject..."
                  />
                </div>
              </div>
            </div>

            {/* Organization Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-8 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-secondary rounded-full"></div>
                <h2 className="font-serif text-lg text-ink font-bold">Organization</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category *</label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none appearance-none transition-all cursor-pointer"
                    >
                      <option value="">Select Category</option>
                      {(availableTags.category || []).map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Skill Level *</label>
                  <div className="relative">
                    <select
                      name="skill"
                      value={formData.skill}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none appearance-none transition-all cursor-pointer"
                    >
                      <option value="">Select Skill</option>
                      {(availableTags.skill || []).map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tags *</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm placeholder:text-gray-400"
                    placeholder="cat, garden, sunshine..."
                  />
                   {/* Theme Clouds */}
                   {availableTags.theme && (
                     <div className="mt-3 flex flex-wrap gap-2">
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
                           className="px-2.5 py-1.5 text-[10px] font-bold bg-white border border-gray-200 text-gray-600 rounded-md hover:border-primary hover:text-primary transition-all shadow-sm"
                         >
                           + {tag.name}
                         </button>
                       ))}
                     </div>
                   )}
              </div>
            </div>

            {/* Rich Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-1 bg-accent rounded-full"></div>
                  <h2 className="font-serif text-lg text-ink font-bold">Rich Content</h2>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-gray-100/80 p-1 rounded-lg">
                  {richContentTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveRichTab(tab.id)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeRichTab === tab.id
                          ? "bg-white text-ink shadow-sm"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px]">
                 {richContentTabs.map(tab => activeRichTab === tab.id && (
                    <div key={tab.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {tab.id === 'tips' ? (
                        <div className="space-y-4">
                           <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coloring Tips</label>
                            <textarea
                              name="coloringTips"
                              value={formData.coloringTips}
                              onChange={handleChange}
                              rows={3}
                              className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all text-sm"
                              placeholder="Start with light colors..."
                            />
                           </div>
                           <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Therapeutic Benefits</label>
                            <textarea
                              name="therapeuticBenefits"
                              value={formData.therapeuticBenefits}
                              onChange={handleChange}
                              rows={3}
                              className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all text-sm"
                              placeholder="Helps develop focus..."
                            />
                           </div>
                        </div>
                      ) : (
                        <textarea
                          name={tab.field}
                          value={String(formData[tab.field])}
                          onChange={handleChange}
                          rows={tab.rows}
                          className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white border focus:border-primary/20 rounded-lg focus:ring-4 focus:ring-primary/5 outline-none resize-none transition-all text-sm"
                          placeholder={tab.placeholder}
                        />
                      )}
                    </div>
                 ))}
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 space-y-4">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider">Publishing Status</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "draft", label: "Draft", icon: EyeOff },
                  { val: "published", label: "Published", icon: Eye }
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
                    <div className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${
                      formData.status === option.val 
                        ? option.val === "draft" 
                          ? "border-amber-200 bg-amber-50 text-amber-900" 
                          : "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}>
                      <option.icon className={`w-5 h-5 ${
                        formData.status === option.val 
                          ? option.val === "draft" ? "text-amber-500" : "text-emerald-500"
                          : "text-gray-400"
                      }`} />
                      <span className="font-bold text-sm">{option.label}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Last Saved</span>
                  <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Magic Upload */}
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-1 rounded-xl border border-primary/10 dashed-border relative overflow-hidden group">
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
               
               {/* Warning for existing assets without source */}
              {isEditing && !originalSvgFile && (
                <div className="mb-2 mx-2 mt-2 bg-amber-50/80 border border-amber-100 rounded-lg p-2.5 flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                   <div>
                      <p className="text-xs font-bold text-amber-800">Source Missing</p>
                      <p className="text-[10px] text-amber-700 leading-tight">Upload SVG to enable regeneration.</p>
                   </div>
                </div>
              )}

              <div 
                className={`relative bg-white/50 rounded-lg p-6 text-center transition-all ${isDragging ? 'bg-primary/10 scale-[0.98]' : 'hover:bg-white/80'}`}
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
                <label htmlFor="svg-upload" className="cursor-pointer block">
                  <div className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-3 transition-transform duration-300 ${isDragging ? "scale-110" : "group-hover:scale-110 group-hover:rotate-3"}`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-ink mb-1">
                    {isProcessingSvg ? "Processing..." : (isDragging ? "Drop SVG Now!" : "Magic Upload")}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Drop your SVG here to auto-generate PDF, Thumbnail, and OG Image.
                  </p>
                </label>
              </div>
            </div>

            {/* Media Gallery Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-5 space-y-4">
              <h3 className="font-bold text-ink text-sm uppercase tracking-wider">Media Gallery</h3>
               
               <div className="grid grid-cols-2 gap-3">
                  {/* Thumbnail */}
                  <div className="col-span-2 relative aspect-[4/3] bg-gray-50 rounded-lg border border-gray-100 overflow-hidden group">
                     {thumbnailPreviewUrl ? (
                       <>
                         <img src={thumbnailPreviewUrl} alt="Thumbnail" className="w-full h-full object-contain p-2" />
                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button 
                              type="button"
                              onClick={() => setIsZoomOpen(true)}
                              className="p-2 bg-white rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                            >
                               <Eye className="w-4 h-4 text-gray-700" />
                            </button>
                         </div>
                       </>
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-300">
                         <div className="text-center">
                           <Loader2 className={`w-6 h-6 mx-auto mb-2 ${isProcessingSvg || processingStatus?.hasActiveJob ? 'animate-spin text-primary' : ''}`} />
                           <span className="text-xs">{processingStatus?.hasActiveJob ? "Generating..." : "Thumbnail"}</span>
                         </div>
                       </div>
                     )}
                     <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">THUMBNAIL</span>
                  </div>

                  {/* OG Image */}
                  <div className="relative aspect-video bg-gray-50 rounded-lg border border-gray-100 overflow-hidden group">
                     {ogPreviewUrl ? (
                       <img src={ogPreviewUrl} alt="OG" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-300">
                         <span className="text-[10px]">OG Image</span>
                       </div>
                     )}
                     <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">SEO</span>
                  </div>

                  {/* PDF Preview */}
                  <div className="relative aspect-[3/4] bg-gray-50 rounded-lg border border-gray-100 overflow-hidden group">
                     {pdfPreviewUrl ? (
                       <iframe src={pdfPreviewUrl} className="w-full h-full pointer-events-none opacity-80" aria-label="PDF Preview" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-300">
                         <span className="text-[10px]">PDF</span>
                       </div>
                     )}
                     
                     {/* Overlay Actions */}
                     <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
                        {pdfPreviewUrl ? (
                           <a 
                             href={pdfPreviewUrl} 
                             download={`${formData.title || 'asset'}.pdf`}
                             className="opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-all text-primary"
                             title="Download PDF"
                           >
                             <Upload className="w-4 h-4 rotate-180" /> 
                           </a>
                        ) : null}
                     </div>
                     <span className="absolute top-2 left-2 text-[10px] font-bold bg-primary/90 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">PDF</span>
                  </div>
               </div>
            </div>

          </div>
        </form>
      </div>

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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-8 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <img 
            src={thumbnailPreviewUrl} 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            alt="Zoomed Thumbnail"
          />
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white text-4xl font-light transition-colors"
            onClick={() => setIsZoomOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
