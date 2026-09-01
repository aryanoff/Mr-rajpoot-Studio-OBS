import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, FileVideo, FileImage, FileAudio, Radio } from "lucide-react";
import Button from "../ui/Button";
import { useUpdateMedia } from "../../hooks/useMedia";
import { getSupabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useStudioStore } from "../../stores/studio.store";
import { calculateMediaFit } from "../../features/studio/studio.constants";

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
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
      {/* Save Status indicator */}
      <div className="text-xs text-text-muted">
        {saveState === "saving" && <span className="text-accent animate-pulse">Saving changes...</span>}
        {saveState === "saved" && <span className="text-status-success">All changes saved</span>}
        {saveState === "error" && <span className="text-status-error">Error saving changes</span>}
      </div>

      {/* Main Info */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-accent outline-none font-medium"
            placeholder="Display title..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => handleDescChange(e.target.value)}
            rows={3}
            className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-text-primary focus:border-accent outline-none resize-none font-normal"
            placeholder="Add a description for this media asset..."
          />
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Preview</label>
        <div className="rounded-xl overflow-hidden bg-black/40 border border-border relative aspect-video flex items-center justify-center">
          {previewUrl ? (
            asset.file_type === "video" ? (
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            ) : asset.file_type === "image" ? (
              <img src={previewUrl} alt={title} className="w-full h-full object-contain" />
            ) : (
              <audio src={previewUrl} controls className="w-3/4" />
            )
          ) : (
            <div className="text-xs text-text-muted">Loading preview...</div>
          )}
        </div>
      </div>

      {/* Technical Metadata */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">File Properties</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-1">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Size</span>
            <span className="text-xs font-semibold text-text-primary block">{formatSize(asset.size_bytes)}</span>
          </div>
          <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-1">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Format</span>
            <span className="text-xs font-semibold text-text-primary uppercase block">{asset.mime_type?.split("/")[1] || asset.file_type}</span>
          </div>
          {asset.duration_seconds && (
            <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-1">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Duration</span>
              <span className="text-xs font-semibold text-text-primary block">{Math.round(asset.duration_seconds)}s</span>
            </div>
          )}
          {asset.width && asset.height && (
            <div className="bg-surface-2/60 p-3 rounded-xl border border-border/50 space-y-1">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Dimensions</span>
              <span className="text-xs font-semibold text-text-primary block">{asset.width} × {asset.height}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MediaDetailsPanel({ asset, onClose, onDelete, isDeleting }: MediaDetailsPanelProps) {
  const navigate = useNavigate();
  if (!asset) return null;

  const handleAddToStudio = () => {
    const store = useStudioStore.getState();
    const cw = store.sceneWidth;
    const ch = store.sceneHeight;
    const w = asset.width || (asset.file_type === 'video' ? 1920 : 800);
    const h = asset.height || (asset.file_type === 'video' ? 1080 : 600);
    const fit = asset.file_type === 'audio' 
      ? { x: 0, y: 0, width: 0, height: 0 } 
      : calculateMediaFit(w, h, cw, ch, "contain");

    store.addSource({
      id: crypto.randomUUID(),
      scene_id: store.sceneId || 'temp',
      type: asset.file_type,
      media_id: asset.id,
      name: asset.title || asset.filename,
      x: fit.x,
      y: fit.y,
      width: fit.width,
      height: fit.height,
      rotation: 0,
      opacity: 1,
      z_index: store.sources.length,
      visible: true,
      locked: false,
      config: {
        fitMode: 'contain',
        originalWidth: w,
        originalHeight: h,
        filePath: asset.file_path,
        ...(asset.file_type === 'video' || asset.file_type === 'audio' ? { volume: 1, loop: true, muted: false } : {})
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    onClose();
    navigate('/studio');
  };

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
        <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(asset.id)}
            disabled={isDeleting || asset.deletion_status !== 'active'}
            className="text-status-error hover:bg-status-error/10 text-xs"
          >
            <Trash2 size={15} className={isDeleting ? "animate-pulse mr-1" : "mr-1"} />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAddToStudio}
            className="text-xs px-4 font-semibold shadow-sm"
          >
            <Radio size={15} className="mr-1.5" />
            Add to Studio Scene
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
