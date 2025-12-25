import { useState, useEffect } from "react";
import { Check, Clock, X } from "lucide-react";

interface DesignRequest {
  id: string;
  email: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  created_at: string;
  admin_notes?: string;
}

export default function AdminDesignRequests() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/requests" : "/api/admin/requests?status=pending";
      const response = await fetch(url, {
        headers: {
            "X-Admin-Email": "marcell@neongod.io" // Identifying as admin (in a real app, this is handled by session/middleware)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data as DesignRequest[]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Email": "marcell@neongod.io"
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchRequests(); // Refresh
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif text-ink">Design Requests</h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === "pending" ? "bg-white shadow-sm text-ink" : "text-gray-500 hover:text-gray-700"}`}
          >
            Pending
          </button>
          <button 
             onClick={() => setFilter("all")}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === "all" ? "bg-white shadow-sm text-ink" : "text-gray-500 hover:text-gray-700"}`}
          >
            All Requests
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
               <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
               </tr>
            ) : requests.length === 0 ? (
               <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No requests found.</td>
               </tr>
            ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{req.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="font-medium mb-1">{req.title}</div>
                      <div className="text-gray-500 line-clamp-2 text-xs">{req.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          req.status === 'completed' ? 'bg-green-100 text-green-800' :
                          req.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {req.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {req.status === 'pending' && (
                          <>
                             <button 
                               onClick={() => updateStatus(req.id, "in_progress")}
                               className="p-1 text-blue-600 hover:bg-blue-50 rounded" 
                               title="Mark In Progress"
                             >
                               <Clock className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => updateStatus(req.id, "completed")}
                               className="p-1 text-green-600 hover:bg-green-50 rounded"
                               title="Complete"
                             >
                                <Check className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={() => updateStatus(req.id, "rejected")}
                               className="p-1 text-red-600 hover:bg-red-50 rounded"
                               title="Reject"
                             >
                               <X className="w-4 h-4" />
                             </button>
                          </>
                        )}
                        {req.status !== 'pending' && (
                           <button 
                             onClick={() => updateStatus(req.id, "pending")}
                             className="text-xs text-gray-400 hover:text-gray-600 underline"
                           >
                             Reset
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
