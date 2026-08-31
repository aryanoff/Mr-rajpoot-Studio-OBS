import { useState } from "react";
import { useStudioStore } from "../../stores/studio.store";
import { Sliders, Monitor, Music, Type, Image as ImageIcon, Layers, ChevronDown, ChevronRight, AlertTriangle, Volume2, VolumeX, AlignLeft, AlignCenter, AlignRight, Square } from "lucide-react";
import { calculateMediaFit, RATIO_PRESETS, isAspectRatioMismatch } from "../../features/studio/studio.constants";
import type { FitMode, AspectRatio } from "../../features/studio/studio.constants";

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
      <div className="flex flex-col h-full overflow-y-auto w-full p-4 space-y-6 custom-scrollbar bg-surface-1">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sliders className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-text-primary text-sm">Scene Canvas Settings</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Canvas Ratio</label>
            <select 
              value={sceneRatio}
              onChange={(e) => setSceneRatio(e.target.value as AspectRatio)}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent font-medium cursor-pointer"
            >
              {RATIO_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted font-mono">
              Resolution: {sceneWidth} &times; {sceneHeight} px
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Background Color</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={sceneBg || '#000000'} 
                onChange={(e) => updateSceneConfig({ sceneBg: e.target.value })}
                className="w-9 h-9 bg-surface-2 border border-border rounded-lg p-1 cursor-pointer" 
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
                <span>Show YouTube Shorts Safe Area</span>
              </label>
            </div>
          )}

          <div className="p-3 bg-surface-2/60 rounded-xl border border-border/50 text-xs text-text-muted leading-relaxed">
            💡 Click on any video, image, or text layer to edit its individual properties and position.
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
      {/* Header with Source Name edit */}
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

      {/* Video & Image: Framing & Layout */}
      {(selectedSource.type === 'video' || selectedSource.type === 'image') && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Framing & Sizing</label>
            <select 
              value={config.fitMode || 'contain'}
              onChange={(e) => applyFitMode(e.target.value as FitMode)}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent font-medium cursor-pointer"
            >
              <option value="contain">Show Full (Fit without cropping)</option>
              <option value="cover">Fill Canvas (Crop edges to fill)</option>
              <option value="crop">Center Crop (Original scale)</option>
            </select>
          </div>

          {/* Mismatch Warning & 1-Click Quick Actions */}
          {hasAspectMismatch && (
            <div className="bg-status-warning-bg border border-status-warning/30 p-3 rounded-xl space-y-2">
              <div className="flex items-start gap-2 text-status-warning">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold">Aspect Ratio Mismatch</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Media ratio differs from canvas. Choose how to fit it:
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => applyFitMode('contain')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${config.fitMode === 'contain' ? 'bg-status-warning text-black border-status-warning' : 'bg-surface-1 text-text-primary border-border hover:bg-surface-2'}`}
                >
                  Show Full
                </button>
                <button
                  type="button"
                  onClick={() => applyFitMode('cover')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${config.fitMode === 'cover' ? 'bg-status-warning text-black border-status-warning' : 'bg-surface-1 text-text-primary border-border hover:bg-surface-2'}`}
                >
                  Fill Frame
                </button>
                <button
                  type="button"
                  onClick={() => applyFitMode('crop')}
                  className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${config.fitMode === 'crop' ? 'bg-status-warning text-black border-status-warning' : 'bg-surface-1 text-text-primary border-border hover:bg-surface-2'}`}
                >
                  Crop
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video & Audio: Playback & Volume */}
      {(selectedSource.type === 'video' || selectedSource.type === 'audio') && (
        <div className="space-y-3 pt-2 border-t border-border">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Audio & Playback</label>
          
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

      {/* Text: Content, Font, Color, Alignment */}
      {selectedSource.type === 'text' && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Text Properties</label>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Text Content</label>
              <textarea 
                value={config.content || ''} 
                onChange={(e) => handleConfigChange('content', e.target.value)}
                placeholder="Enter text layer content..."
                className="w-full bg-surface-2 border border-border rounded-xl p-2.5 text-xs text-text-primary min-h-[70px] outline-none focus:border-accent resize-none font-medium" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-secondary font-medium">Font Size</label>
                <input 
                  type="number" 
                  min="12" max="240"
                  value={config.fontSize || 48} 
                  onChange={(e) => handleConfigChange('fontSize', Math.max(12, Number(e.target.value)))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-text-secondary font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={config.color || '#ffffff'} 
                    onChange={(e) => handleConfigChange('color', e.target.value)}
                    className="w-8 h-8 bg-surface-2 border border-border rounded-lg p-1 cursor-pointer" 
                  />
                  <span className="text-xs font-mono text-text-secondary">{config.color || '#ffffff'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-secondary font-medium">Alignment</label>
              <div className="flex bg-surface-2 rounded-xl p-1 border border-border">
                <button
                  type="button"
                  onClick={() => handleConfigChange('align', 'left')}
                  className={`flex-1 py-1 flex items-center justify-center rounded-lg transition-colors ${config.align === 'left' ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleConfigChange('align', 'center')}
                  className={`flex-1 py-1 flex items-center justify-center rounded-lg transition-colors ${(!config.align || config.align === 'center') ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleConfigChange('align', 'right')}
                  className={`flex-1 py-1 flex items-center justify-center rounded-lg transition-colors ${config.align === 'right' ? 'bg-surface-1 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer Opacity */}
      <div className="space-y-2 pt-2 border-t border-border">
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

      {/* Advanced Settings Accordion (Collapsed by Default) */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full py-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>Advanced Geometry & Coordinates</span>
          {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-text-muted">X Position</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.x)}
                  onChange={(e) => handleChange('x', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted">Y Position</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.y)}
                  onChange={(e) => handleChange('y', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted">Width</label>
                <input 
                  type="number"
                  value={Math.round(selectedSource.width)}
                  onChange={(e) => handleChange('width', Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-muted">Height</label>
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
