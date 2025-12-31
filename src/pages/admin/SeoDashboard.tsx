import { useState } from "react";
import { Heading, Button } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Globe, ExternalLink } from "lucide-react";

export default function SeoDashboard() {
  const [keywords, setKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<{ keyword: string; status: 'pending' | 'success' | 'error'; message?: string; url?: string }[]>([]);

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
            newLogs[i] = { 
                keyword, 
                status: 'success', 
                message: res.slug, 
                url: res.url 
            };
            return newLogs;
         });
       } catch (error: any) {
         setLogs(prev => {
            const newLogs = [...prev];
            newLogs[i] = { 
                keyword, 
                status: 'error', 
                message: error.message || "Failed" 
            };
            return newLogs;
         });
       }
    }

    setIsGenerating(false);
    toast.success("Batch generation complete");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
           <Heading>pSEO Keyword Engine</Heading>
           <p className="text-gray-500">Turn keywords into traffic. 1 keyword = 1 landing page.</p>
         </div>
         <Button variant="outline" onClick={() => window.open("/sitemap.xml", "_blank")}>
            <Globe className="w-4 h-4 mr-2" />
            View Sitemap
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Input Section */}
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Keywords (One per line)
            </label>
            <textarea 
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              placeholder={`coloring pages for anxiety
coloring pages for adhd
cute dragon coloring pages
easy mandala coloring pages`}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={isGenerating}
            />
            
            <div className="mt-4 flex justify-end">
               <Button 
                 variant="primary" 
                 size="lg" 
                 onClick={handleBulkGenerate} 
                 disabled={isGenerating || !keywords.trim()}
                 className="w-full sm:w-auto"
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

         {/* Logs Section */}
         <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 h-[30rem] overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-4 sticky top-0 bg-gray-50 pb-2 border-b">
               Execution Log
            </h3>
            
            {logs.length === 0 ? (
               <div className="text-center text-gray-400 py-20">
                  Waiting for input...
               </div>
            ) : (
               <div className="space-y-3">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                       <div className="flex items-center gap-3">
                          {log.status === 'pending' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                          {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                          
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.keyword}</p>
                            {log.message && <p className="text-xs text-gray-500 truncate max-w-[200px]">{log.message}</p>}
                          </div>
                       </div>
                       
                       {log.url && (
                         <a href={log.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                         </a>
                       )}
                    </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
