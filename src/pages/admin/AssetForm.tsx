import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { Upload, Save, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";

import { Tag } from "@/api/types";

import { jsPDF } from "jspdf";
import "svg2pdf.js";

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
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingSvg, setIsProcessingSvg] = useState(false);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);
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

  const handleSvgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingSvg(true);
    try {
      // 1. WebP Generation (Canvas)
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("No canvas context"));
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas blob failed"));
          }, "image/webp", 0.9);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
      
      const webpFile = new File([webpBlob], file.name.replace(".svg", ".webp"), { type: "image/webp" });
      setThumbnailFile(webpFile);

      // 2. Advanced PDF Generation (Safe Zone & Metadata)
      const svgText = await file.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      // Helper to parse dimensions (handle px or unitless)
      const getDim = (val: string | null) => {
        if (!val) return 0;
        return parseFloat(val.replace("px", ""));
      };
      
      // Determine intrinsic size (width/height attr -> viewBox -> Default A4 pt)
      const viewBox = svgElement.getAttribute("viewBox")?.split(/[\s,]+/).map(parseFloat);
      const svgW = getDim(svgElement.getAttribute("width")) || (viewBox ? viewBox[2] : 595);
      const svgH = getDim(svgElement.getAttribute("height")) || (viewBox ? viewBox[3] : 842);

      // A4 Dimensions (mm)
      const A4_WIDTH = 210;
      const A4_HEIGHT = 297;
      
      // Safe Zone (mm) - Optimized for 8.5x11" (Letter) and A4 compatibility
      // Letter is wider (216mm) but shorter (279mm) than A4.
      // A4 is narrower (210mm) but taller (297mm).
      // To fit BOTH, we must stay within the intersection minus margins.
      // Width: Limited by A4 (210mm) - 25mm margin = 185mm
      // Height: Limited by Letter (279mm) - 25mm margin = 254mm
      const SAFE_WIDTH = 185; 
      const SAFE_HEIGHT = 254;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4" 
      });

      // Inject Metadata (Hidden properties)
      doc.setProperties({
        title: formData.title || file.name.replace(".svg", ""),
        subject: formData.description || "Coloring Page from HuePress",
        author: "HuePress",
        keywords: `${formData.category}, ${formData.skill}, coloring page, huepress`,
        creator: "HuePress Automated Generator"
      });

      // Calculate Scale to fit Safe Zone strictly
      const scale = Math.min(SAFE_WIDTH / svgW, SAFE_HEIGHT / svgH);
      const finalW = svgW * scale;
      const finalH = svgH * scale;

      // Center image on A4 page
      const x = (A4_WIDTH - finalW) / 2;
      const y = (A4_HEIGHT - finalH) / 2;

      // Page 1: The Masterpiece
      await doc.svg(svgElement, {
        x,
        y,
        width: finalW,
        height: finalH
      });
      
      // Footer REMOVED per request (clean page for coloring)

      // Page 2: The HuePress Guide (Stylish Marketing Page)
      doc.addPage();
      
      // HEADER
      doc.setFont("times", "bold");
      doc.setFontSize(32);
      doc.setTextColor(30);
      doc.text("HuePress", 105, 30, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Color Your World", 105, 38, { align: "center" });
      
      doc.setDrawColor(200);
      doc.line(60, 45, 150, 45); // Separator

      // SECTION 1: PRINTING GUIDE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text("Printing Guide", 20, 65);

      // Box
      doc.setDrawColor(220);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, 70, 170, 35, 3, 3, "FD");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("• Use 'Fit to Page' setting to ensure no edges are cut off.", 28, 82);
      doc.text("• We recommend heavy cardstock or mixed media paper.", 28, 90);
      doc.text("• Select 'High Quality' print mode for the crispest lines.", 28, 98);

      // SECTION 2: SHARE & ENGAGE
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text("Show Off Your Masterpiece", 20, 125);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text("We love seeing your creativity! Tag us to be featured:", 20, 135);
      
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("@HuePress  #HuePressColoring", 20, 145);

      // SECTION 3: REVIEWS (Call to Action)
      doc.setDrawColor(200); 
      doc.setLineWidth(0.5);
      doc.roundedRect(20, 165, 170, 40, 3, 3, "S");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("Enjoying this page?", 105, 180, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text("Help us grow by leaving a review on Trustpilot:", 105, 190, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("huepress.co/review", 105, 198, { align: "center" });

      // FOOTER
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Discover thousands more at huepress.co", 105, 260, { align: "center" });
      // Generate a short ID
      const shortId = formData.title ? formData.title.substring(0, 15).replace(/\s/g, "") : "Asset";
      doc.text(`Asset ID: ${shortId}-${new Date().getTime().toString().slice(-6)}`, 105, 265, { align: "center" });

      const pdfBlob = doc.output("blob");
      const pdfFileObj = new File([pdfBlob], file.name.replace(".svg", ".pdf"), { type: "application/pdf" });
      setPdfFile(pdfFileObj);
      
      // Create Preview URL
      const previewUrl = URL.createObjectURL(pdfFileObj);
      setPdfPreviewUrl(previewUrl);

      setAlertState({
        isOpen: true,
        title: "Magic Complete! ✨",
        message: "Successfully generated safe-zone PDF and WebP.",
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
              <label className="block text-sm font-medium text-ink mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
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
               <label className="block text-sm font-medium text-ink mb-2">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
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
              
              <div className="relative">
                <input
                  type="file"
                  accept="image/svg+xml"
                  onChange={handleSvgUpload}
                  className="hidden"
                  id="svg-upload"
                />
                <label
                  htmlFor="svg-upload"
                  className="flex flex-col items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-primary/30 bg-white/50 rounded-lg cursor-pointer hover:border-primary hover:bg-white/80 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {isProcessingSvg ? "Generating files..." : "Upload Master SVG"}
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
              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
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
                     className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-100"
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
                    pdfFile ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-red-500 hover:bg-red-50"
                  }`}
                >
                  <Upload className={`w-4 h-4 ${pdfFile ? "text-red-500" : "text-gray-400"}`} />
                  <span className={`text-xs ${pdfFile ? "text-red-600 font-medium" : "text-gray-500"}`}>
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
    </div>
  );
}
