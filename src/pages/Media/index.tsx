import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Search,
  Grid3X3,
  List,
  Video,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { useMediaAssets, useUploadMedia, useDeleteMedia } from "../../hooks/useMedia";
import type { MediaAsset } from "../../hooks/useMedia";
import MediaPreview from "../../components/studio/MediaPreview";
import MediaDetailsPanel from "../../components/media/MediaDetailsPanel";

type MediaFilter = "all" | "video" | "image" | "audio" | "processing" | "ready" | "failed";
type ViewMode = "grid" | "list";

export default function Media() {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: mediaAssets = [], isLoading: isFetching, error: fetchError } = useMediaAssets();
  const { mutate: uploadMedia, isPending: isUploading } = useUploadMedia();
  const { mutate: deleteMedia, isPending: isDeleting, variables: deletingId } = useDeleteMedia();

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm("Are you sure you want to delete this media? It will be checked against active dependencies before deletion.")) {
      deleteMedia(id, {
        onError: (err) => alert("Delete failed: " + err.message),
        onSuccess: () => {
          if (selectedAsset?.id === id) {
             setSelectedAsset(null);
          }
        }
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g., 50MB for test)
    if (file.size > 50 * 1024 * 1024) {
      setUploadErrorMsg("Storage limit reached. Max 50 MB per file allowed.");
      return;
    }
    
    // Quick MIME check
    if (!file.type.startsWith("video/") && !file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
       setUploadErrorMsg("Unsupported file type.");
       return;
    }

    uploadMedia(file, {
      onSuccess: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      onError: (err) => {
        setUploadErrorMsg("Upload failed: " + err.message);
      },
    });
  };

  const filtered = mediaAssets.filter((item) => {
    let matchesFilter = false;
    if (filter === "all") matchesFilter = true;
    else if (filter === "video" || filter === "image" || filter === "audio") matchesFilter = item.file_type === filter;
    else matchesFilter = item.processing_status === filter;

    const query = searchQuery.toLowerCase();
    const matchesSearch = item.filename.toLowerCase().includes(query) || (item.title && item.title.toLowerCase().includes(query));
    
    return matchesFilter && matchesSearch;
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
         <AlertTriangle size={48} className="text-status-error mb-4 opacity-80" />
         <h2 className="text-lg font-bold text-text-primary">Couldn't load your media library.</h2>
         <p className="text-sm text-text-secondary mt-2">There was an issue communicating with the database.</p>
         <Button variant="primary" size="md" className="mt-6" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Media Library"
        description="Manage your professional content assets"
        action={
          <Button 
            variant="accent" 
            size="md" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? "Uploading..." : "Upload Media"}
          </Button>
        }
      />

      {/* Upload zone */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/mp4,video/quicktime,image/jpeg,image/png,audio/mpeg,audio/wav"
        onChange={handleFileUpload}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isUploading 
              ? "border-accent/30 cursor-not-allowed bg-accent/5" 
              : "border-border hover:border-accent/30 cursor-pointer group"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-accent animate-spin mb-3" />
              <p className="text-sm text-text-primary font-medium">Uploading to secure storage...</p>
              <p className="text-xs text-text-muted mt-1">Please keep this window open.</p>
            </div>
          ) : (
            <>
              <Upload
                size={32}
                className="text-text-muted mx-auto mb-3 group-hover:text-accent-light transition-colors"
              />
              <p className="text-sm text-text-secondary mb-1">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-text-muted">
                MP4, MOV, JPG, PNG, MP3, WAV — Max 50 MB per file
              </p>
              {uploadErrorMsg && (
                 <p className="text-sm text-status-error font-medium mt-4">{uploadErrorMsg}</p>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Filters + View toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "video", "image", "audio", "processing", "ready", "failed"] as MediaFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                filter === f
                  ? "bg-accent/10 text-accent-light border border-accent/20"
                  : "bg-surface-2 text-text-muted hover:text-text-primary border border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 border border-border md:w-64">
            <Search size={14} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search title, filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
            />
          </div>
          <div className="flex bg-surface-2 rounded-lg p-0.5 border border-border shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md cursor-pointer ${viewMode === "grid" ? "bg-accent/20 text-accent-light" : "text-text-muted"}`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md cursor-pointer ${viewMode === "list" ? "bg-accent/20 text-accent-light" : "text-text-muted"}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Media items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isFetching ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
             {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video bg-surface-2 animate-pulse rounded-2xl border border-border"></div>
             ))}
          </div>
        ) : mediaAssets.length === 0 ? (
          <div className="text-center p-20 border border-border bg-surface-2 rounded-3xl">
            <Video size={48} className="text-text-muted mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-bold text-text-primary mb-2">Your media library is empty.</h2>
            <p className="text-text-secondary mb-6">Upload your first video, image, or audio file to start producing.</p>
            <Button variant="accent" onClick={() => fileInputRef.current?.click()}>Upload Media</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 border border-border bg-surface-2 rounded-2xl">
            <p className="text-text-secondary">No media found matching your filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => {
              const isProcessing = item.processing_status === 'queued' || item.processing_status === 'processing';
              const isFailed = item.processing_status === 'failed';
              return (
                <Card key={item.id} hover padding="none" className="group overflow-hidden relative cursor-pointer" onClick={() => setSelectedAsset(item as MediaAsset)}>
                  {/* Preview */}
                  <div className="aspect-video bg-black flex items-center justify-center relative">
                    {isProcessing ? (
                       <div className="flex flex-col items-center justify-center">
                          <Loader2 size={24} className="text-accent animate-spin mb-2" />
                          <span className="text-[10px] uppercase font-bold text-accent-light tracking-widest">{item.processing_status}</span>
                       </div>
                    ) : isFailed ? (
                       <div className="flex flex-col items-center justify-center">
                          <AlertTriangle size={24} className="text-status-error mb-2 opacity-80" />
                          <span className="text-[10px] uppercase font-bold text-status-error tracking-widest">Failed</span>
                       </div>
                    ) : (
                       <>
                         <MediaPreview filePath={item.file_path} fileType={item.file_type} thumbnailPath={item.thumbnail_path} />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 z-10">
                            <div className="flex items-center justify-between">
                               <button 
                                 onClick={(e) => handleDelete(item.id, e)}
                                 disabled={isDeleting && deletingId === item.id || item.deletion_status === 'retention_pending'}
                                 className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 cursor-pointer disabled:opacity-50"
                               >
                                 {isDeleting && deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                               </button>
                            </div>
                         </div>
                       </>
                    )}
                    
                    {item.duration_seconds && !isProcessing && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono z-10">
                        {item.duration_seconds.toFixed(0)}s
                      </span>
                    )}
                    
                    {item.deletion_status !== 'active' && (
                      <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold z-10 ${item.deletion_status === 'delete_failed' ? 'bg-status-error text-white' : 'bg-status-warning text-black'}`}>
                        {item.deletion_status === 'retention_pending' ? 'Pending Deletion' : item.deletion_status}
                      </span>
                    )}
                  </div>
                  <div className="p-3 border-t border-border/50 bg-surface">
                    <p className="text-sm font-semibold text-text-primary truncate" title={item.title || item.filename}>
                      {item.title || item.filename}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-muted font-mono">{formatSize(item.size_bytes)}</span>
                      <Badge variant={isProcessing ? "warning" : isFailed ? "error" : "default"} size="sm">
                        {isProcessing ? "Processing" : isFailed ? "Failed" : item.file_type}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card variant="glass" padding="none">
            <div className="divide-y divide-border">
              {filtered.map((item) => {
                const isProcessing = item.processing_status === 'queued' || item.processing_status === 'processing';
                const isFailed = item.processing_status === 'failed';
                
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAsset(item as MediaAsset)}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-surface-2/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-16 h-12 bg-black rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center border border-border/50">
                         {isProcessing ? <Loader2 size={16} className="text-accent animate-spin" /> : 
                          isFailed ? <AlertTriangle size={16} className="text-status-error" /> :
                          <MediaPreview filePath={item.file_path} fileType={item.file_type} thumbnailPath={item.thumbnail_path} />}
                      </div>
                      
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate" title={item.title || item.filename}>
                          {item.title || item.filename}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                          <span className="font-mono">{formatSize(item.size_bytes)}</span>
                          <span className="hidden md:inline">• {formatDate(item.created_at)}</span>
                          {item.duration_seconds && <span className="font-mono flex items-center gap-1"><Clock size={10}/> {item.duration_seconds.toFixed(0)}s</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {item.deletion_status !== 'active' && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.deletion_status === 'delete_failed' ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'}`}>
                          {item.deletion_status === 'retention_pending' ? 'Pending' : item.deletion_status}
                        </span>
                      )}
                      
                      {isProcessing ? (
                         <Badge variant="warning" size="sm" className="hidden sm:inline-flex">Processing</Badge>
                      ) : isFailed ? (
                         <Badge variant="error" size="sm" className="hidden sm:inline-flex">Failed</Badge>
                      ) : (
                         <Badge variant="default" size="sm" className="hidden sm:inline-flex">{item.file_type}</Badge>
                      )}
                      
                      <button 
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={isDeleting && deletingId === item.id || item.deletion_status === 'retention_pending'}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {isDeleting && deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Details Side Panel */}
      <MediaDetailsPanel
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onDelete={(id) => handleDelete(id)}
        isDeleting={isDeleting && deletingId === selectedAsset?.id}
      />
    </div>
  );
}
