import { useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { useStudioStore } from "../../stores/studio.store";
import { Image as ImageIcon, Video, Lock } from "lucide-react";
import MediaPreview from "./MediaPreview";

export default function StudioCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sceneWidth = useStudioStore((s) => s.sceneWidth);
  const sceneHeight = useStudioStore((s) => s.sceneHeight);
  const sceneBg = useStudioStore((s) => s.sceneBg);
  const sceneRatio = useStudioStore((s) => s.sceneRatio);
  
  const sources = useStudioStore((s) => s.sources);
  const selectedSourceId = useStudioStore((s) => s.selectedSourceId);
  const setSelectedSource = useStudioStore((s) => s.setSelectedSource);
  const updateSource = useStudioStore((s) => s.updateSource);

  const editorMode = useStudioStore((s) => s.editorMode);
  const zoom = useStudioStore((s) => s.zoom);
  const pan = useStudioStore((s) => s.pan);
  const setZoom = useStudioStore((s) => s.setZoom);
  const setPan = useStudioStore((s) => s.setPan);
  const showSafeArea = useStudioStore((s) => s.showSafeArea);

  const [autoScale, setAutoScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const container = entries[0].contentRect;
      if (container.width <= 0 || container.height <= 0) return;
      const scaleX = (container.width - 40) / sceneWidth;
      const scaleY = (container.height - 40) / sceneHeight;
      setAutoScale(Math.min(scaleX, scaleY));
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [sceneWidth, sceneHeight]);

  const sortedSources = [...sources].sort((a, b) => a.z_index - b.z_index);
  const activeScale = zoom === 'auto' ? autoScale : zoom;

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      let newZoom = activeScale + delta;
      newZoom = Math.max(0.1, Math.min(newZoom, 4));
      setZoom(newZoom);
    } else {
      setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (e.target === containerRef.current) {
      setSelectedSource(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[380px] flex items-center justify-center bg-slate-950/95 dark:bg-black rounded-2xl border border-border/80 overflow-hidden relative select-none shadow-inner"
      onClick={(e) => {
        if (e.target === containerRef.current) setSelectedSource(null);
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      {/* Background Dot Grid for Workspace */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />

      {/* Logical Canvas Container with Transform Viewport */}
      <div 
        className="absolute transition-transform origin-center flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`
        }}
      >
        <div 
          className="relative shadow-2xl origin-center overflow-hidden pointer-events-auto border-2 border-slate-700/80 ring-2 ring-black/80 rounded-sm"
          style={{
            width: sceneWidth,
            height: sceneHeight,
            backgroundColor: sceneBg || '#000000',
            transform: `scale(${activeScale})`,
          }}
        >
          {/* Subtle Output Frame Header Bar in Editor Mode */}
          {editorMode === 'editor' && (
            <div className="absolute top-2 left-2 z-30 pointer-events-none flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono text-white/80 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>OUTPUT FRAME ({sceneWidth}×{sceneHeight})</span>
            </div>
          )}
          {/* Source Layers */}
          {sortedSources.map((source) => {
            if (!source.visible) return null;
            
            const isSelected = selectedSourceId === source.id && editorMode === 'editor';
            const isAudio = source.type === 'audio';

            // Audio sources are purely non-visual
            if (isAudio) return null;

            return (
              <Rnd
                key={source.id}
                size={{ width: source.width || 200, height: source.height || 150 }}
                position={{ x: source.x, y: source.y }}
                onDragStop={(_e, d) => {
                  if (source.locked || editorMode === 'preview') return;
                  updateSource(source.id, { x: Math.round(d.x), y: Math.round(d.y) });
                }}
                onResizeStop={(_e, _direction, ref, _delta, position) => {
                  if (source.locked || editorMode === 'preview') return;
                  updateSource(source.id, {
                    width: Math.max(10, Math.round(ref.offsetWidth)),
                    height: Math.max(10, Math.round(ref.offsetHeight)),
                    x: Math.round(position.x),
                    y: Math.round(position.y),
                  });
                }}
                disableDragging={source.locked || editorMode === 'preview'}
                enableResizing={!source.locked && isSelected && editorMode === 'editor'}
                bounds="parent"
                style={{
                  zIndex: source.z_index,
                  opacity: source.opacity ?? 1,
                  transform: `translate(${source.x}px, ${source.y}px) rotate(${source.rotation || 0}deg)`,
                }}
                className={`absolute flex items-center justify-center ${
                  isSelected ? 'border-2 border-accent shadow-glow' : editorMode === 'editor' ? 'hover:border hover:border-accent/40 border-transparent' : 'border-transparent'
                }`}
                onClick={(e: any) => {
                  e.stopPropagation();
                  if (editorMode === 'editor') setSelectedSource(source.id);
                }}
                resizeHandleComponent={isSelected ? {
                  topLeft: <div className="w-3.5 h-3.5 bg-white border-2 border-accent rounded-full -ml-1.5 -mt-1.5 shadow-sm" />,
                  topRight: <div className="w-3.5 h-3.5 bg-white border-2 border-accent rounded-full -mr-1.5 -mt-1.5 shadow-sm" />,
                  bottomLeft: <div className="w-3.5 h-3.5 bg-white border-2 border-accent rounded-full -ml-1.5 -mb-1.5 shadow-sm" />,
                  bottomRight: <div className="w-3.5 h-3.5 bg-white border-2 border-accent rounded-full -mr-1.5 -mb-1.5 shadow-sm" />,
                } : undefined}
              >
                <div 
                  className="w-full h-full relative"
                  style={{
                    transform: `rotate(${source.rotation || 0}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Video Source */}
                  {source.type === 'video' && (
                    <div className="w-full h-full relative overflow-hidden pointer-events-none">
                      {(source.config as any)?.filePath ? (
                        <MediaPreview 
                          filePath={(source.config as any).filePath} 
                          fileType="video" 
                          thumbnailPath={(source.config as any).thumbnailPath}
                          fitMode={(source.config as any)?.fitMode || 'contain'}
                          autoPlay={true}
                          loop={(source.config as any)?.loop ?? true}
                          muted={true}
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-2/80 backdrop-blur flex flex-col items-center justify-center text-text-muted">
                          <Video size={36} className="mb-2 opacity-60 text-accent-cyan" />
                          <span className="text-sm font-medium">{source.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Image Source */}
                  {source.type === 'image' && (
                    <div className="w-full h-full relative overflow-hidden pointer-events-none">
                      {(source.config as any)?.filePath ? (
                        <MediaPreview 
                          filePath={(source.config as any).filePath} 
                          fileType="image"
                          fitMode={(source.config as any)?.fitMode || 'contain'}
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-2/80 backdrop-blur flex flex-col items-center justify-center text-text-muted">
                          <ImageIcon size={36} className="mb-2 opacity-60 text-accent-light" />
                          <span className="text-sm font-medium">{source.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Text Layer */}
                  {source.type === 'text' && (
                    <div 
                      className="w-full h-full font-bold flex items-center overflow-hidden pointer-events-none p-2"
                      style={{
                        fontSize: `${(source.config as any)?.fontSize || 48}px`,
                        color: (source.config as any)?.color || '#ffffff',
                        justifyContent: (source.config as any)?.align === 'left' ? 'flex-start' : (source.config as any)?.align === 'right' ? 'flex-end' : 'center',
                        textAlign: ((source.config as any)?.align || 'center') as any,
                        textShadow: '0 2px 8px rgba(0,0,0,0.7)'
                      }}
                    >
                      {(source.config as any)?.content || "Text Layer"}
                    </div>
                  )}
                  
                  {/* Overlay Layer */}
                  {source.type === 'overlay' && (
                    <div 
                      className="w-full h-full pointer-events-none"
                      style={{
                        backgroundColor: (source.config as any)?.color || 'rgba(0,0,0,0.5)'
                      }}
                    />
                  )}
                  
                  {/* Lock Indicator */}
                  {source.locked && editorMode === 'editor' && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur p-1 rounded-md">
                      <Lock size={12} className="text-status-warning" />
                    </div>
                  )}
                </div>
              </Rnd>
            );
          })}

          {/* Safe Area Guides (9:16 Vertical Shorts, Editor Only) */}
          {sceneRatio === '9:16' && showSafeArea && editorMode === 'editor' && (
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-accent/40 m-12 rounded-lg flex flex-col justify-between p-4">
              <span className="text-xs font-mono text-accent/80 bg-black/50 px-2 py-0.5 rounded self-start">
                Safe Area Top (Shorts UI)
              </span>
              <span className="text-xs font-mono text-accent/80 bg-black/50 px-2 py-0.5 rounded self-end">
                Safe Area Bottom (Comments & CTA)
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Canvas Viewport HUD (Zoom & Fit controls) */}
      <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-mono text-white/90 flex items-center gap-2.5 border border-white/10 shadow-lg">
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => setZoom(Math.max(0.1, (zoom === 'auto' ? autoScale : zoom) - 0.15))} 
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Zoom Out"
          >
            &minus;
          </button>
          
          <button 
            type="button"
            onClick={() => { setZoom('auto'); setPan({ x: 0, y: 0 }); }} 
            className="px-2 py-0.5 rounded hover:bg-white/20 transition-colors text-[11px] font-semibold" 
            title="Reset to Fit Screen"
          >
            Fit
          </button>
          
          <button 
            type="button"
            onClick={() => setZoom(Math.min(4, (zoom === 'auto' ? autoScale : zoom) + 0.15))} 
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors"
            title="Zoom In"
          >
            +
          </button>
        </div>
        
        <span className="text-white/60">|</span>
        <span className="text-[11px] min-w-[36px] text-right">{Math.round(activeScale * 100)}%</span>
      </div>
    </div>
  );
}
