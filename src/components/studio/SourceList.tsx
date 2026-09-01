import { useState } from "react";
import { useStudioStore } from "../../stores/studio.store";
import { Layers, Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Monitor, Music, Type, Plus, Trash2, ArrowUp, ArrowDown, Square } from "lucide-react";
import Button from "../ui/Button";

interface SourceListProps {
  onAddMedia: (type: "video" | "image" | "audio") => void;
  onAddText: () => void;
  onAddOverlay: () => void;
}

export default function SourceList({ onAddMedia, onAddText, onAddOverlay }: SourceListProps) {
  const sources = useStudioStore((s) => s.sources);
  const selectedSourceId = useStudioStore((s) => s.selectedSourceId);
  const setSelectedSource = useStudioStore((s) => s.setSelectedSource);
  const updateSource = useStudioStore((s) => s.updateSource);
  const removeSource = useStudioStore((s) => s.removeSource);
  const moveLayer = useStudioStore((s) => s.moveLayer);

  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Sources sorted by z_index descending (top layer displayed at top)
  const sortedSources = [...sources].sort((a, b) => b.z_index - a.z_index);

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Monitor className="w-3.5 h-3.5 text-accent-cyan" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-accent-light" />;
      case 'audio': return <Music className="w-3.5 h-3.5 text-status-scheduled" />;
      case 'text': return <Type className="w-3.5 h-3.5 text-status-warning" />;
      case 'overlay': return <Square className="w-3.5 h-3.5 text-text-secondary" />;
      default: return <Layers className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="flex flex-col h-1/2 bg-surface-1 w-full shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-surface-1">
        <div>
          <h3 className="font-semibold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-accent" />
            Sources ({sources.length})
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">Media & layers in this scene</p>
        </div>
        
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-7 h-7 p-0 text-text-secondary hover:text-text-primary"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            title="Add Layer / Source"
          >
            <Plus className="w-4 h-4" />
          </Button>
          
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-border rounded-lg shadow-popover z-50 py-1 overflow-hidden">
                <button 
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  onClick={() => { onAddMedia('video'); setAddMenuOpen(false); }}
                >
                  <Monitor className="w-3.5 h-3.5 text-accent-cyan" /> Video Source
                </button>
                <button 
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  onClick={() => { onAddMedia('image'); setAddMenuOpen(false); }}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-accent-light" /> Image / Logo
                </button>
                <button 
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  onClick={() => { onAddMedia('audio'); setAddMenuOpen(false); }}
                >
                  <Music className="w-3.5 h-3.5 text-status-scheduled" /> Background Audio
                </button>
                <button 
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  onClick={() => { onAddText(); setAddMenuOpen(false); }}
                >
                  <Type className="w-3.5 h-3.5 text-status-warning" /> Text Overlay
                </button>
                <button 
                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  onClick={() => { onAddOverlay(); setAddMenuOpen(false); }}
                >
                  <Square className="w-3.5 h-3.5 text-text-secondary" /> Color / Shape Overlay
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {sortedSources.length === 0 ? (
          <div className="text-center py-5 px-3 text-xs space-y-2.5 bg-surface-2/40 rounded-xl border border-dashed border-border/70 my-1">
            <div>
              <p className="font-semibold text-text-primary">Build your broadcast</p>
              <p className="text-[11px] text-text-muted mt-0.5">Add a video or image to start your scene</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <Button variant="primary" size="sm" onClick={() => onAddMedia('video')} className="w-full justify-center">
                <Monitor className="w-3.5 h-3.5 mr-1.5" /> Add Video
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onAddMedia('image')} className="w-full justify-center">
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Add Image
              </Button>
            </div>
          </div>
        ) : (
          sortedSources.map((source, index) => {
            const isSelected = selectedSourceId === source.id;
            
            return (
              <div 
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`
                  group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-xs
                  ${isSelected ? 'bg-accent/10 border-accent text-accent font-medium' : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary border-transparent'}
                  border
                `}
              >
                <div className="shrink-0 opacity-80 group-hover:opacity-100">
                  {getIcon(source.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="truncate select-none font-medium text-text-primary">
                    {source.name || source.type}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  {/* Visibility Toggle */}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      updateSource(source.id, { visible: !source.visible }); 
                    }}
                    className={`p-1 rounded hover:bg-surface-3 transition-colors ${source.visible ? 'text-text-muted hover:text-text-primary' : 'text-status-error'}`}
                    title={source.visible ? "Hide Layer" : "Show Layer"}
                  >
                    {source.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Lock Toggle */}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      updateSource(source.id, { locked: !source.locked }); 
                    }}
                    className={`p-1 rounded hover:bg-surface-3 transition-colors ${source.locked ? 'text-status-warning' : 'text-text-muted hover:text-text-primary'}`}
                    title={source.locked ? "Unlock Layer" : "Lock Layer"}
                  >
                    {source.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  {/* Layer Z-Index Move */}
                  <div className="flex items-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayer(source.id, 'forward'); }}
                      disabled={index === 0}
                      className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-20 transition-opacity"
                      title="Move Forward"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveLayer(source.id, 'backward'); }}
                      disabled={index === sortedSources.length - 1}
                      className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-20 transition-opacity"
                      title="Move Backward"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Remove Source */}
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      removeSource(source.id); 
                    }}
                    className="p-1 rounded text-text-muted hover:text-status-error hover:bg-status-error-bg transition-colors"
                    title="Remove Layer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
