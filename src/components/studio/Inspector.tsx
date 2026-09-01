import { useState } from "react";
import { useStudioStore } from "../../stores/studio.store";
import { 
  Sliders, 
  Monitor, 
  Music, 
  Type, 
  Image as ImageIcon, 
  Layers, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Square
} from "lucide-react";
import { calculateMediaFit, RATIO_PRESETS, isAspectRatioMismatch, FIT_MODE_LABELS } from "../../features/studio/studio.constants";
import type { FitMode } from "../../features/studio/studio.constants";
import MediaPreview from "./MediaPreview";

export default function Inspector() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const selectedSourceId = useStudioStore((s) => s.selectedSourceId);
  const sources = useStudioStore((s) => s.sources);
  const updateSource = useStudioStore((s) => s.updateSource);
  const sceneWidth = useStudioStore((s) => s.sceneWidth);
  const sceneHeight = useStudioStore((s) => s.sceneHeight);
  const sceneRatio = useStudioStore((s) => s.sceneRatio);
  const setSceneRatio = useStudioStore((s) => s.setSceneRatio);
  const sceneBg = useStudioStore((s) => s.sceneBg);
  const updateSceneConfig = useStudioStore((s) => s.updateSceneConfig);
  const showSafeArea = useStudioStore((s) => s.showSafeArea);
  const setShowSafeArea = useStudioStore((s) => s.setShowSafeArea);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  // ── No Source Selected: Scene Properties ──
  if (!selectedSource) {
    return (
      <div className="flex flex-col h-full overflow-y-auto w-full p-4 space-y-5 custom-scrollbar bg-surface-1">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sliders className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-text-primary text-sm">Scene Layout</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Canvas Format</label>
            <div className="grid grid-cols-1 gap-2">
              {RATIO_PRESETS.map((preset) => {
                const isSelected = sceneRatio === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSceneRatio(preset.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? "border-accent bg-accent/10 text-text-primary shadow-sm" 
                        : "border-border bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{preset.label}</div>
                      <div className="text-[11px] text-text-muted">{preset.description}</div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-1 border border-border/50 text-text-muted">
                      {preset.subLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Background Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={sceneBg || '#000000'} 
                onChange={(e) => updateSceneConfig({ sceneBg: e.target.value })}
                className="w-8 h-8 bg-surface-2 border border-border rounded-lg p-1 cursor-pointer" 
              />
              <span className="text-xs font-mono text-text-secondary">{sceneBg || '#000000'}</span>
            </div>
          </div>

          {sceneRatio === '9:16' && (
            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input 
                  type="checkbox"
                  checked={showSafeArea}
                  onChange={(e) => setShowSafeArea(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>Show Shorts Safe Guidelines</span>
              </label>
            </div>
          )}

          <div className="p-3 bg-surface-2/60 rounded-xl border border-border/50 text-xs text-text-muted leading-relaxed">
            💡 Select any layer on the canvas or in the Sources list to edit its options.
          </div>
        </div>
      </div>
    );
  }

  // ── Source Selected: Contextual Properties ──
  const handleChange = (field: string, value: any) => {
    updateSource(selectedSource.id, { [field]: value });
  };

  const handleConfigChange = (field: string, value: any) => {
    const currentConfig = (selectedSource.config as Record<string, any>) || {};
    updateSource(selectedSource.id, {
      config: { ...currentConfig, [field]: value },
    });
  };

  const applyFitMode = (mode: FitMode) => {
    handleConfigChange('fitMode', mode);
    const ow = (selectedSource.config as any)?.originalWidth || selectedSource.width;
    const oh = (selectedSource.config as any)?.originalHeight || selectedSource.height;
    const fit = calculateMediaFit(ow, oh, sceneWidth, sceneHeight, mode);
    updateSource(selectedSource.id, {
      x: fit.x,
      y: fit.y,
      width: fit.width,
      height: fit.height
    });
  };

  const renderIcon = () => {
    switch (selectedSource.type) {
      case 'video': return <Monitor className="w-4 h-4 text-accent-cyan" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-accent-light" />;
      case 'audio': return <Music className="w-4 h-4 text-status-scheduled" />;
      case 'text': return <Type className="w-4 h-4 text-status-warning" />;
      case 'overlay': return <Square className="w-4 h-4 text-text-secondary" />;
      default: return <Layers className="w-4 h-4 text-text-muted" />;
    }
  };

  const config = (selectedSource.config as Record<string, any>) || {};
  const originalWidth = config.originalWidth || selectedSource.width;
  const originalHeight = config.originalHeight || selectedSource.height;
  const hasAspectMismatch = (selectedSource.type === 'video' || selectedSource.type === 'image') &&
    isAspectRatioMismatch(originalWidth, originalHeight, sceneWidth, sceneHeight);

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full p-4 space-y-5 custom-scrollbar bg-surface-1">
      {/* 1. Header with Layer Name */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {renderIcon()}
          <input 
            type="text"
            value={selectedSource.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="font-semibold text-text-primary text-sm bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none truncate"
            placeholder="Layer Name"
          />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-2 text-text-muted">
          {selectedSource.type}
        </span>
      </div>

      {/* Mini Visual Preview (for Video/Image) */}
      {(selectedSource.type === 'video' || selectedSource.type === 'image') && (config.filePath || config.thumbnailPath) && (
        <div className="relative w-full h-24 rounded-xl overflow-hidden bg-black/40 border border-border">
          <MediaPreview 
            filePath={config.filePath}
            thumbnailPath={config.thumbnailPath}
            fileType={selectedSource.type}
            fitMode={config.fitMode || "contain"}
            autoPlay={false}
            loop={false}
            muted={true}
          />
        </div>
      )}

      {/* 2. Video & Audio Playback Controls */}
      {(selectedSource.type === 'video' || selectedSource.type === 'audio') && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Playback</label>
          <div className="space-y-2 bg-surface-2 p-3 rounded-xl border border-border">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="flex items-center gap-1.5 font-medium">
                {config.muted ? <VolumeX className="w-3.5 h-3.5 text-status-error" /> : <Volume2 className="w-3.5 h-3.5 text-accent" />}
                Volume
              </span>
              <span className="font-mono">{config.muted ? 'Muted' : `${Math.round((config.volume ?? 1) * 100)}%`}</span>
            </div>
            
            <input 
              type="range" 
              min="0" max="1" step="0.05"
              value={config.muted ? 0 : (config.volume ?? 1)} 
              onChange={(e) => {
                handleConfigChange('volume', Number(e.target.value));
                if (config.muted) handleConfigChange('muted', false);
              }}
              className="w-full accent-accent cursor-pointer" 
            />

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-text-secondary cursor-pointer font-medium">
                <input 
                  type="checkbox"
                  checked={config.muted ?? false}
                  onChange={(e) => handleConfigChange('muted', e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>Mute</span>
              </label>

              <label className="flex items-center gap-2 text-text-secondary cursor-pointer font-medium">
                <input 
                  type="checkbox"
                  checked={config.loop ?? true}
                  onChange={(e) => handleConfigChange('loop', e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>{selectedSource.type === 'audio' ? 'Loop Audio' : 'Loop Video'}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 3. Framing & Fit Mode (Video & Image) */}
      {(selectedSource.type === 'video' || selectedSource.type === 'image') && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Framing</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["contain", "cover", "crop"] as FitMode[]).map((mode) => {
              const isSelected = (config.fitMode || "contain") === mode;
              const info = FIT_MODE_LABELS[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => applyFitMode(mode)}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                    isSelected 
                      ? "bg-accent/15 border-accent text-accent-light shadow-sm" 
                      : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:bg-surface-3"
                  }`}
                  title={info.description}
                >
                  {info.label}
                </button>
              );
            })}
          </div>

          {hasAspectMismatch && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-status-warning-bg border border-status-warning/30 text-[11px] text-status-warning">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Ratio mismatch: choose "Fill Canvas" or "Show Full"</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Text Properties */}
      {selectedSource.type === 'text' && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Text</label>
          <div className="space-y-2.5">
            <textarea 
              value={config.content || ''} 
              onChange={(e) => handleConfigChange('content', e.target.value)}
              placeholder="Enter text layer content..."
              className="w-full bg-surface-2 border border-border rounded-xl p-2.5 text-xs text-text-primary min-h-[60px] outline-none focus:border-accent resize-none font-medium" 
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-text-muted">Size</label>
                <input 
                  type="number" 
                  min="12" max="240"
                  value={config.fontSize || 48} 
                  onChange={(e) => handleConfigChange('fontSize', Math.max(12, Number(e.target.value)))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent" 
                />
              </div>

              <div>
                <label className="text-[11px] text-text-muted">Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.color || '#ffffff'} 
                    onChange={(e) => handleConfigChange('color', e.target.value)}
                    className="w-7 h-7 bg-surface-2 border border-border rounded-lg p-0.5 cursor-pointer" 
                  />
                  <span className="text-xs font-mono text-text-secondary">{config.color || '#ffffff'}</span>
                </div>
              </div>
            </div>

            <div className="flex bg-surface-2 rounded-lg p-1 border border-border">
              <button
                type="button"
                onClick={() => handleConfigChange('align', 'left')}
                className={`flex-1 py-1 flex items-center justify-center rounded transition-colors ${config.align === 'left' ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange('align', 'center')}
                className={`flex-1 py-1 flex items-center justify-center rounded transition-colors ${(!config.align || config.align === 'center') ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleConfigChange('align', 'right')}
                className={`flex-1 py-1 flex items-center justify-center rounded transition-colors ${config.align === 'right' ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Layer Opacity */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="font-semibold text-text-muted uppercase tracking-wider">Opacity</span>
          <span className="font-mono">{Math.round((selectedSource.opacity ?? 1) * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" max="1" step="0.05"
          value={selectedSource.opacity ?? 1} 
          onChange={(e) => handleChange('opacity', Number(e.target.value))}
          className="w-full accent-accent cursor-pointer" 
        />
      </div>

      {/* 6. Advanced Settings Accordion (Hidden by default, U-06) */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full py-1 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          <span>Advanced Position & Size</span>
          {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="space-y-2 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-text-muted">X</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.x)}
                  onChange={(e) => handleChange('x', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Y</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.y)}
                  onChange={(e) => handleChange('y', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Width</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.width)}
                  onChange={(e) => handleChange('width', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Height</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.height)}
                  onChange={(e) => handleChange('height', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
