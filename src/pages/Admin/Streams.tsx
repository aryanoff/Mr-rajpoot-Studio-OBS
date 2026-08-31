import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MoreVertical, Radio, Square } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { useStreams, useStopStream } from "../../features/streams/streams.hooks";

const statusVariant: Record<string, "live" | "scheduled" | "success" | "error" | "default"> = { live: "live", queued: "scheduled", draft: "default", completed: "success", error: "error" };

export default function AdminStreams() {
  const { data: streams, isLoading } = useStreams();
  const stopStream = useStopStream();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStreams = streams?.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">All Streams</h1>
        <p className="text-sm text-text-secondary mt-1">Monitor and manage streams across all users</p>
      </div>

      <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border max-w-md">
        <Search size={16} className="text-text-muted" />
        <input 
          type="text" 
          placeholder="Search streams..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                  <th className="text-left py-3 px-5 font-semibold">Stream</th>
                  <th className="text-left py-3 px-3 font-semibold">User ID</th>
                  <th className="text-left py-3 px-3 font-semibold">Status</th>
                  <th className="text-left py-3 px-3 font-semibold hidden md:table-cell">Resolution</th>
                  <th className="text-left py-3 px-3 font-semibold hidden lg:table-cell">Created</th>
                  <th className="text-right py-3 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading streams...</td></tr>
                ) : filteredStreams.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">No streams found.</td></tr>
                ) : (
                  filteredStreams.map((stream) => (
                    <tr key={stream.id} className="hover:bg-surface-2/30 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${stream.status === "live" ? "bg-status-live-bg" : "bg-surface-2"}`}>
                            <Radio size={14} className={stream.status === "live" ? "text-status-live" : "text-text-muted"} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{stream.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-text-secondary truncate max-w-[100px]">{stream.user_id}</td>
                      <td className="py-3 px-3">
                        <Badge variant={statusVariant[stream.status] || "default"} size="sm">{stream.status}</Badge>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell text-sm text-text-secondary font-mono">{stream.resolution}</td>
                      <td className="py-3 px-3 hidden lg:table-cell text-sm text-text-muted">{new Date(stream.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-5 text-right flex justify-end gap-2">
                        {(stream.status === "live" || stream.status === "queued" || stream.status === ("reconnecting" as any)) && (
                          <button onClick={() => stopStream.mutate(stream.id)} className="p-1.5 rounded-lg hover:bg-surface-2 text-status-error cursor-pointer" title="Stop">
                            <Square size={16} />
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
