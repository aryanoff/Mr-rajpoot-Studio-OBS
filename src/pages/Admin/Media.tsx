import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Search, RefreshCw, Film, Image as ImageIcon, Music, HardDrive } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useMediaAssets, type MediaAsset } from "../../hooks/useMedia";
import { useAdminUsers } from "../../features/admin/admin.hooks";
import { formatBytes } from "../../lib/utils";
import { formatAdminDate } from "../../features/admin/adminFormatters";

export default function AdminMedia() {
  const { data: mediaList = [], isLoading, refetch } = useMediaAssets();
  const { data: users = [] } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState("");

  const userMap = new Map(users.map((u) => [u.user_id, u.full_name || u.username || 'Creator']));

  const totalBytes = mediaList.reduce((acc: number, m: MediaAsset) => acc + (m.size_bytes || 0), 0);

  const filteredMedia = mediaList.filter((m: MediaAsset) => {
    const q = searchQuery.toLowerCase();
    const creatorName = (userMap.get(m.user_id) || '').toLowerCase();
    const fileName = (m.title || m.filename || '').toLowerCase();
    return fileName.includes(q) || creatorName.includes(q);
  });

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film size={15} className="text-purple-400" />;
      case 'image':
        return <ImageIcon size={15} className="text-accent-light" />;
      case 'audio':
        return <Music size={15} className="text-emerald-400" />;
      default:
        return <FolderOpen size={15} className="text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Media & Cloud Storage</h1>
          <p className="text-xs text-text-muted mt-1">Manage uploaded creator assets, processing queues, and storage retention</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw size={13} className={`mr-1.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Storage Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Total Cloud Assets</span>
          <div className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FolderOpen size={20} className="text-accent" />
            <span>{mediaList.length}</span>
          </div>
          <span className="text-[11px] text-text-muted">Files across all creators</span>
        </Card>

        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Storage Footprint</span>
          <div className="text-2xl font-bold text-status-warning flex items-center gap-2">
            <HardDrive size={20} />
            <span>{formatBytes(totalBytes)}</span>
          </div>
          <span className="text-[11px] text-text-muted">Supabase Storage allocation</span>
        </Card>

        <Card variant="glass" padding="md" className="space-y-1">
          <span className="text-xs text-text-muted font-medium block">Processing State</span>
          <div className="text-2xl font-bold text-status-success flex items-center gap-2">
            <span>Ready</span>
          </div>
          <span className="text-[11px] text-text-muted">FFmpeg metadata & thumbnail extraction</span>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3.5 py-2 border border-border max-w-md">
        <Search size={16} className="text-text-muted shrink-0" />
        <input 
          type="text" 
          placeholder="Search by file name or creator..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none w-full" 
        />
      </div>

      {/* Media Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card variant="glass" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border bg-surface-2/60">
                  <th className="py-3 px-5 font-semibold">Media File</th>
                  <th className="py-3 px-4 font-semibold">Creator</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Size</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Duration</th>
                  <th className="py-3 px-5 font-semibold text-right">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">Loading media assets...</td></tr>
                ) : filteredMedia.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">No media files found.</td></tr>
                ) : (
                  filteredMedia.map((media: MediaAsset) => {
                    const creatorName = userMap.get(media.user_id) || "Creator";
                    return (
                      <tr key={media.id} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-surface-2 shrink-0">
                              {getMediaIcon(media.file_type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text-primary truncate">{media.title || media.filename || "Untitled File"}</p>
                              <p className="text-[11px] text-text-muted font-mono">{media.mime_type || "video/mp4"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-text-primary">
                          {creatorName}
                        </td>
                        <td className="py-3 px-4 capitalize text-text-secondary">
                          {media.file_type}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-secondary">
                          {formatBytes(media.size_bytes || 0)}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-text-secondary">
                          {media.duration_seconds ? `${Math.round(media.duration_seconds)}s` : "—"}
                        </td>
                        <td className="py-3 px-5 text-right text-text-muted">
                          {formatAdminDate(media.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
