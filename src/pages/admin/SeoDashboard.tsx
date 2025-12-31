import { useState, useEffect, useCallback } from "react";
import { Button, AlertModal } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, ExternalLink, Trash2, FileText, Sparkles, Search, ChevronLeft, ChevronRight, Globe } from "lucide-react";

export default function SeoDashboard() {
  const [keywords, setKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [logs, setLogs] = useState<{ keyword: string; status: 'pending' | 'success' | 'error'; message?: string; url?: string }[]>([]);
  
  // List state
  const [pages, setPages] = useState<{ id: string; slug: string; target_keyword: string; title: string; is_published: number; created_at: string }[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const itemsPerPage = 20;
  
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; pageId: string; pageTitle: string }>({ isOpen: false, pageId: '', pageTitle: '' });

  // Fetch pages - wrapped in useCallback to prevent infinite loops
  const loadPages = useCallback(async () => {
    try {
      setIsLoadingPages(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const data = await apiClient.seo.list({
        limit: itemsPerPage,
        offset,
        search: searchQuery || undefined
      });
      setPages(data.pages);
      setTotalPages(Math.ceil(data.total / itemsPerPage));
    } catch (error) {
      console.error("Failed to load pages:", error);
      toast.error("Failed to load pages");
    } finally {
      setIsLoadingPages(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = async (id: string, title: string) => {
    setDeleteModal({ isOpen: true, pageId: id, pageTitle: title });
  };

  const confirmDelete = async () => {
    try {
      await apiClient.seo.deletePage(deleteModal.pageId);
      toast.success("Page deleted");
      setDeleteModal({ isOpen: false, pageId: '', pageTitle: '' });
      loadPages();
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
    toast.success("Generation complete");
    loadPages();
  };

  const handleAutoGenerate = async () => {
    if (isDiscovering) return; // Prevent multiple executions
    
    setIsDiscovering(true);
    try {
      const seeds = ['anxiety', 'adhd', 'bold', 'easy', 'mandala', 'geometric', 'floral', 'kids'];
      const allKeywords: string[] = [];
      
      for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        
        const result = await apiClient.seo.research(seed);
        // Handle both {results: [...]} and {results: {results: [...]}}
        const results = Array.isArray(result.results) 
          ? result.results 
          : (Array.isArray((result.results as any)?.results) ? (result.results as any).results : []);
        
        
        const top5 = results.map((r: { keyword: string }) => r.keyword);
        allKeywords.push(...top5);
        
        // Update keywords in real-time so user sees progress
        setKeywords(allKeywords.join("\n"));
        toast.success(`✓ "${seed}" → ${top5.length} keywords | Total: ${allKeywords.length}`, {
          duration: 2000
        });
      }

      setShowKeywordInput(true);
      toast.success(`🎉 Discovered ${allKeywords.length} keywords from ${seeds.length} topics!`, {
        duration: 4000
      });
    } catch (error) {
      toast.error("Failed to discover keywords");
      console.error(error);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-h2 text-ink">pSEO Pages</h1>
          <p className="text-gray-500">Manage auto-generated landing pages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowKeywordInput(!showKeywordInput)}
          >
            {showKeywordInput ? "Hide" : "Show"} Keyword Input
          </Button>
          <Button
            variant="primary"
            onClick={handleAutoGenerate}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Discover Keywords
              </>
            )}
          </Button>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Globe className="w-4 h-4 mr-2" />
              Sitemap
            </Button>
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-ink">{pages.length}</p>
              <p className="text-sm text-gray-500">Landing Pages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyword Input Section - Collapsible */}
      {showKeywordInput && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-serif font-bold text-xl text-ink">Bulk Generate</h2>
            <p className="text-sm text-gray-500 mt-1">One keyword per line</p>
          </div>
          <div className="p-6">
            <textarea
              className="w-full h-48 p-4 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              placeholder="coloring pages for anxiety
coloring pages for adhd
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

          {/* Logs */}
          {logs.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {log.status === 'pending' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                      {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <p className="text-sm truncate">{log.keyword}</p>
                    </div>
                    {log.url && (
                      <a href={log.url} target="_blank" rel="noopener noreferrer" className="p-1 text-primary hover:text-primary/80">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, keyword, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Target Keyword</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoadingPages ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading pages...
                </td>
              </tr>
            ) : pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No pages found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchQuery ? "Try a different search" : "Generate keywords above to start"}
                  </p>
                </td>
              </tr>
            ) : (
              pages.map((page, idx) => (
                <tr 
                  key={page.id}
                  className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-primary/5`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink text-sm">{page.title}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{page.target_keyword}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{page.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(page.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/collection/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-all"
                        title="View page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(page.id, page.title)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pages.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
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
