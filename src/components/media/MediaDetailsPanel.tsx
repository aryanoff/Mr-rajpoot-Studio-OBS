import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Clock, HardDrive, Settings, Trash2, Maximize, AlertTriangle, FileVideo, FileImage, FileAudio } from "lucide-react";
import Button from "../ui/Button";
import { useUpdateMedia } from "../../hooks/useMedia";
import { getSupabase } from "../../lib/supabase";

interface MediaAsset {
  id: string;
  filename: string;
  title: string | null;
  description: string | null;
  file_path: string;
  file_type: string;
  size_bytes: number;
  mime_type: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  bitrate: number | null;
  sample_rate: number | null;
  created_at: string;
  deletion_status: string;
}

interface MediaDetailsPanelProps {
  asset: MediaAsset | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function MediaDetailsForm({ asset }: { asset: MediaAsset }) {
  const [title, setTitle] = useState(asset.title || asset.filename);
  const [description, setDescription] = useState(asset.description || "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutateAsync: updateMedia } = useUpdateMedia();

  useEffect(() => {
    let isMounted = true;
    async function fetchUrl() {
      const { data } = await getSupabase().storage.from("user_media").createSignedUrl(asset.file_path, 3600);
      if (isMounted && data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
      }
    }
    fetchUrl();
    return () => { isMounted = false; };
  }, [asset.file_path]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (val !== (asset.title || asset.filename)) {
      setSaveState("saving");
    }
  };

  const handleDescChange = (val: string) => {
    setDescription(val);
    if (val !== (asset.description || "")) {
      setSaveState("saving");
    }
  };

  useEffect(() => {
    if (title === (asset.title || asset.filename) && description === (asset.description || "")) {
      return;
    }
    
    const timeout = setTimeout(async () => {
      try {
        await updateMedia({ id: asset.id, updates: { title, description } });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        console.error(err);
        setSaveState("error");
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeout);
  }, [title, description, asset, updateMedia]);

  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8">
      {/* Save Status indicator */}
      <div className="text-xs text-text-muted">
        {saveState === "saving" && <span className="text-accent animate-pulse">Saving changes...</span>}
        {saveState === "saved" && <span className="text-status-success">All changes saved</span>}
        {saveState === "error" && <span className="text-status-error">Save failed</span>}
        {saveState === "idle" && "View and edit metadata"}
      </div>

      {/* Preview Section */}
      <div className="rounded-2xl overflow-hidden bg-black aspect-video relative flex items-center justify-center border border-white/10 shadow-lg">
        {previewUrl ? (
          asset.file_type === 'video' ? (
            <video src={previewUrl} controls className="w-full h-full object-contain" />
          ) : asset.file_type === 'audio' ? (
            <audio src={previewUrl} controls className="w-full" />
          ) : (
            <img src={previewUrl} className="w-full h-full object-contain" alt={title} />
          )
        ) : (
          <div className="animate-pulse w-full h-full bg-surface-2 flex items-center justify-center text-text-muted text-sm">
            Loading preview...
          </div>
        )}
      </div>

      {/* Editable Metadata */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Basic Information</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="Enter a title..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => handleDescChange(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all h-24 resize-none"
              placeholder="Enter a description..."
            />
          </div>
        </div>
      </div>

      {/* Technical Metadata */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Settings size={14} />
          Technical Metadata
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2/50 border border-border/50 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5"><Clock size={12}/> Duration</span>
            <span className="text-sm font-mono text-text-primary">{asset.duration_seconds ? `${asset.duration_seconds.toFixed(2)}s` : 'N/A'}</span>
          </div>
          <div className="bg-surface-2/50 border border-border/50 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5"><Maximize size={12}/> Resolution</span>
            <span className="text-sm font-mono text-text-primary">{(asset.width && asset.height) ? `${asset.width}x${asset.height}` : 'N/A'}</span>
          </div>
          <div className="bg-surface-2/50 border border-border/50 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5"><HardDrive size={12}/> File Size</span>
            <span className="text-sm font-mono text-text-primary">{formatSize(asset.size_bytes)}</span>
          </div>
          <div className="bg-surface-2/50 border border-border/50 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1.5"><Play size={12}/> Codecs</span>
            <span className="text-xs font-mono text-text-primary truncate" title={asset.video_codec || asset.audio_codec || 'N/A'}>
              {asset.video_codec || asset.audio_codec || 'N/A'}
            </span>
          </div>
        </div>
        <div className="text-xs text-text-muted space-y-1 pt-2 border-t border-border/50">
           <p><span className="font-semibold text-text-secondary">Filename:</span> {asset.filename}</p>
           <p><span className="font-semibold text-text-secondary">MIME Type:</span> {asset.mime_type || 'Unknown'}</p>
           <p><span className="font-semibold text-text-secondary">Uploaded:</span> {new Date(asset.created_at).toLocaleString()}</p>
           <p><span className="font-semibold text-text-secondary">Bitrate:</span> {asset.bitrate ? `${Math.round(asset.bitrate / 1000)} kbps` : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

export default function MediaDetailsPanel({ asset, onClose, onDelete, isDeleting }: MediaDetailsPanelProps) {
  if (!asset) return null;

  const getIcon = () => {
    if (asset.file_type === "video") return <FileVideo size={24} className="text-accent-light" />;
    if (asset.file_type === "image") return <FileImage size={24} className="text-status-success" />;
    return <FileAudio size={24} className="text-status-warning" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-surface/95 backdrop-blur-3xl border-l border-border shadow-2xl z-50 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-2 rounded-lg">
              {getIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Media Details</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-2 text-text-muted transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <MediaDetailsForm key={asset.id} asset={asset} />

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
             {asset.deletion_status !== 'active' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                  <AlertTriangle size={12} />
                  Pending Deletion
                </div>
             )}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(asset.id)}
            disabled={isDeleting || asset.deletion_status !== 'active'}
            className="text-status-error hover:bg-status-error/10"
          >
            <Trash2 size={16} className={isDeleting ? "animate-pulse" : ""} />
            {isDeleting ? "Deleting..." : "Delete Media"}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
