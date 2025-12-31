import { useState, useEffect } from "react";
import { Button, AlertModal } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Globe, ExternalLink, Trash2, FileText, Sparkles, ArrowUpRight } from "lucide-react";

export default function SeoDashboard() {
  const [keywords, setKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<{ keyword: string; status: 'pending' | 'success' | 'error'; message?: string; url?: string }[]>([]);
  const [existingPages, setExistingPages] = useState<{ id: string; slug: string; target_keyword: string; title: string; is_published: number; created_at: string }[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; pageId: string; pageTitle: string }>({ isOpen: false, pageId: '', pageTitle: '' });

  // Fetch existing pages on load
  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setIsLoadingPages(true);
      const pages = await apiClient.seo.list();
      setExistingPages(pages);
    } catch (error) {
      console.error("Failed to load pages:", error);
      toast.error("Failed to load existing pages");
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setDeleteModal({ isOpen: true, pageId: id, pageTitle: title });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.seo.deletePage(deleteModal.pageId);
      toast.success("Page deleted");
      setDeleteModal({ isOpen: false, pageId: '', pageTitle: '' });
      loadPages(); // Refresh list
    } catch (error) {
      toast.error("Failed to delete page");
      console.error(error);
    }
  };

  const handleBulkGenerate = async () => {
    const lines = keywords.split("\n").map(k => k.trim()).filter(k => k.length > 0);
    if (lines.length === 0) {
      toast.error("Please enter at least one keyword");
      return;
    }

    setIsGenerating(true);
    setLogs(lines.map(k => ({ keyword: k, status: 'pending' })));

    // Process sequentially to be nice to APIs (and debugging) -> In prod maybe parallel batching
    for (let i = 0; i < lines.length; i++) {
       const keyword = lines[i];
       
       try {
         const res = await apiClient.seo.generate(keyword);
         
         setLogs(prev => {
            const newLogs = [...prev];
            newLogs[i] = { keyword, status: 'success', url: `/collection/${res.slug}` };
            return newLogs;
         });
       } catch (error) {
         setLogs(prev => {
            const newLogs = [...prev];
            newLogs[i] = { keyword, status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
            return newLogs;
         });
       }
    }

    setIsGenerating(false);
    toast.success("Batch generation complete");
    loadPages(); // Refresh list
  };

  const handleAutoGenerate = async () => {
    try {
      // Fetch keyword suggestions from the research endpoint
      toast.info("Discovering keywords...");
      const seeds = ['anxiety', 'adhd', 'bold', 'easy', 'mandala', 'geometric', 'floral', 'kids'];
      const allKeywords: string[] = [];
      
      for (const seed of seeds) {
        const result = await apiClient.seo.research(seed);
        // Handle both array and object responses
        const results = Array.isArray(result.results) ? result.results : [];
        const top5 = results.slice(0, 5).map(r => r.keyword);
        allKeywords.push(...top5);
      }

      // Populate the textarea
      setKeywords(allKeywords.join("\n"));
      toast.success(`Discovered ${allKeywords.length} keywords! Review and click Generate.`);
    } catch (error) {
      toast.error("Failed to discover keywords");
      console.error(error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-h2 text-ink mb-2">pSEO Engine</h1>
        <p className="text-gray-500">Automated keyword research and landing page generation</p>
      </div>

      {/* Stats & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Stat Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-ink mb-1">{existingPages.length}</p>
          <p className="text-sm font-medium text-gray-500">Landing Pages</p>
        </div>

        {/* Quick Action: Discover Keywords */}
        <button
          onClick={handleAutoGenerate}
          disabled={isGenerating}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
              <Sparkles className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="font-semibold text-ink group-hover:text-primary transition-colors mb-1">Discover Keywords</p>
          <p className="text-xs text-gray-500">Auto-fill 40 keyword suggestions</p>
        </button>

        {/* Quick Action: View Sitemap */}
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group text-left"
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-ink/10 rounded-xl flex items-center justify-center group-hover:bg-ink group-hover:scale-110 transition-all">
              <Globe className="w-6 h-6 text-ink group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="font-semibold text-ink group-hover:text-primary transition-colors mb-1 flex items-center gap-2">
            View Sitemap
            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-xs text-gray-500">Check indexed pages</p>
        </a>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Keyword Input Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-serif font-bold text-xl text-ink">Target Keywords</h2>
              <p className="text-sm text-gray-500 mt-1">One keyword per line - each becomes a unique landing page</p>
            </div>
            <div className="p-6">
              <textarea
                className="w-full h-64 p-4 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                placeholder="coloring pages for anxiety
coloring pages for adhd
cute dragon coloring pages
easy mandala coloring pages"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={isGenerating}
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {keywords.split('\n').filter(k => k.trim()).length} keywords ready
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleBulkGenerate}
                  disabled={isGenerating || !keywords.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Pages"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Execution Log Card */}
          {logs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-serif font-bold text-xl text-ink">Generation Log</h2>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {log.status === 'pending' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                        {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{log.keyword}</p>
                          {log.message && (
                            <p className="text-xs text-gray-500 truncate">{log.message}</p>
                          )}
                        </div>
                      </div>
                      {log.url && (
                        <a href={log.url} target="_blank" rel="noopener noreferrer" className="ml-2 p-2 text-gray-400 hover:text-primary transition-colors flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Existing Pages Sidebar - 1 column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit sticky top-6">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-serif font-bold text-xl text-ink">Generated Pages</h2>
            <button
              onClick={loadPages}
              disabled={isLoadingPages}
              className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {isLoadingPages ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-sm font-medium">Refresh</span>
              )}
            </button>
          </div>

          {isLoadingPages ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : existingPages.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No pages yet</p>
              <p className="text-xs text-gray-400 mt-1">Generate keywords above to start</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {existingPages.map((page) => (
                <div key={page.id} className="p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-ink truncate mb-1">{page.title}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{page.target_keyword}</p>
                      <a
                        href={`/collection/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View page <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <button
                      onClick={() => handleDelete(page.id, page.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, pageId: '', pageTitle: '' })}
        title="Delete pSEO Page?"
        message={`Are you sure you want to delete "${deleteModal.pageTitle}"? This action cannot be undone.`}
        variant="error"
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
