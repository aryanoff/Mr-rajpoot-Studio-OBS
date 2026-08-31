import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Image as ImageIcon } from "lucide-react";
import Button from "../ui/Button";
import { useMediaAssets } from "../../hooks/useMedia";
import type { MediaAsset } from "../../hooks/useMedia";
import { useStudioStore } from "../../stores/studio.store";
import MediaPreview from "./MediaPreview";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (asset: MediaAsset) => void;
  mediaType?: "video" | "image" | "audio" | null;
}

export default function MediaPickerModal({ isOpen, onClose, onSelect, mediaType }: MediaPickerModalProps) {
  const { data: mediaAssets = [], isLoading } = useMediaAssets();
  const [searchQuery, setSearchQuery] = useState("");
  const addSource = useStudioStore((s) => s.addSource);
  const sources = useStudioStore((s) => s.sources);

  const filteredAssets = mediaAssets.filter((asset) => {
    const isReady = asset.processing_status === "ready";
    const isActive = asset.deletion_status === "active";
    const matchesType = !mediaType || asset.file_type === mediaType;
    const matchesSearch = asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (asset.title && asset.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return isReady && isActive && matchesType && matchesSearch;
  });

  const handleSelect = (asset: MediaAsset) => {
    if (onSelect) {
      onSelect(asset);
    } else {
      addSource({
        id: crypto.randomUUID(),
        scene_id: useStudioStore.getState().sceneId || "temp",
        media_id: asset.id,
        type: asset.file_type as "video" | "image" | "audio",
        name: asset.filename,
        x: 50,
        y: 50,
        width: 400,
        height: asset.file_type === "audio" ? 100 : 225,
        rotation: 0,
        opacity: 1,
        z_index: sources.length,
        visible: true,
        locked: false,
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    onClose();
  };



  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[80vh] flex flex-col bg-surface-1 border border-border rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Select Media</h2>
              <p className="text-sm text-text-secondary mt-0.5">Choose a file from your library to add to the scene.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-border bg-surface-2/30">
            <div className="flex items-center gap-2 bg-surface-1 rounded-xl px-3 py-2 border border-border">
              <Search size={16} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search your media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Loader2 size={32} className="animate-spin mb-4 text-accent" />
                <p>Loading media library...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted text-center">
                <ImageIcon size={48} className="opacity-20 mb-4" />
                <p className="text-lg font-medium text-text-primary">No media found</p>
                <p className="text-sm mt-1">Upload files in the Media Library first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelect(asset)}
                      className="group cursor-pointer rounded-xl border border-border bg-surface-2 overflow-hidden hover:border-accent transition-colors"
                    >
                      <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                        <MediaPreview filePath={asset.file_path} fileType={asset.file_type} thumbnailPath={asset.thumbnail_path} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all z-10"></div>
                        {asset.duration_seconds && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono z-20">
                            {asset.duration_seconds.toFixed(0)}s
                          </span>
                        )}
                      </div>
                      <div className="p-2 border-t border-border">
                        <p className="text-xs font-medium text-text-primary truncate" title={asset.title || asset.filename}>
                          {asset.title || asset.filename}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase mt-0.5">{asset.file_type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
