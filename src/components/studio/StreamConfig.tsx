import { useState } from "react";
import { useStudioStore } from "../../stores/studio.store";
import { useStreamDestinations, useCreateDestination, useStreams } from "../../features/streams/streams.hooks";
import Button from "../ui/Button";
import { 
  Youtube, 
  Settings, 
  Play, 
  Square, 
  Loader2, 
  Monitor, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  ChevronUp, 
  ChevronDown, 
  Radio, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Check,
  Tv,
  Sparkles,
  Repeat,
  Lock
} from "lucide-react";
import { RATIO_PRESETS, TESTED_OUTPUT_PROFILES } from "../../features/studio/studio.constants";
import type { AspectRatio } from "../../features/studio/studio.constants";
import { validateSceneSnapshot } from "../../features/studio/snapshotValidator";
import MediaPreview from "./MediaPreview";

export type BroadcastState = 
  | 'OFFLINE' 
  | 'PREPARING' 
  | 'STARTING' 
  | 'LIVE' 
  | 'RECONNECTING' 
  | 'STOPPING' 
  | 'ERROR';

interface StreamConfigProps {
  onStartStream: (config: any) => Promise<void>;
  broadcastState?: BroadcastState;
  isStarting?: boolean;
  isLive?: boolean;
  onStopStream: () => Promise<void>;
  onSelectThumbnail?: () => void;
  thumbnailUrl?: string | null;
}

export default function StreamConfig({
  onStartStream,
  broadcastState,
  isStarting = false,
  isLive = false,
  onStopStream,
  onSelectThumbnail,
  thumbnailUrl
}: StreamConfigProps) {
  const { data: savedDestinations = [], isLoading: isLoadingDestinations } = useStreamDestinations();
  const createDestination = useCreateDestination();

  const studioLoadingState = useStudioStore((s) => s.studioLoadingState);
  const sceneRatio = useStudioStore((s) => s.sceneRatio);
  const setSceneRatio = useStudioStore((s) => s.setSceneRatio);
  const sceneName = useStudioStore((s) => s.sceneName);
  const sources = useStudioStore((s) => s.sources);
  const streamTitle = useStudioStore((s) => s.streamTitle);
  const setStreamTitle = useStudioStore((s) => s.setStreamTitle);
  const streamDescription = useStudioStore((s) => s.streamDescription);
  const setStreamDescription = useStudioStore((s) => s.setStreamDescription);
  
  const isBottomCollapsed = useStudioStore((s) => s.isBottomPanelCollapsed);
  const toggleBottomPanel = useStudioStore((s) => s.toggleBottomPanel);

  const [activeTab, setActiveTab] = useState<"info" | "destination" | "output" | "check">("info");
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("1080p-30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [streamKeyInput, setStreamKeyInput] = useState("");
  const [destLabelInput, setDestLabelInput] = useState("");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Default to first saved destination if none selected
  const activeDestId = selectedDestId || (savedDestinations.length > 0 ? savedDestinations[0].secret_id : "");
  const selectedProfile = TESTED_OUTPUT_PROFILES.find(p => p.id === selectedProfileId) || TESTED_OUTPUT_PROFILES[0];

  // Derive effective broadcast state
  const effectiveState: BroadcastState = broadcastState || (
    isLive ? 'LIVE' : isStarting ? 'STARTING' : 'OFFLINE'
  );

  const updateSource = useStudioStore((s) => s.updateSource);
  const isBroadcastLocked = useStudioStore((s) => s.isBroadcastLocked);

  // Authoritative media sources & loop derivation (Single Source of Truth)
  const mediaSources = sources.filter(s => s.type === 'video' || s.type === 'audio');
  const hasMediaSources = mediaSources.length > 0;
  const isLooping = hasMediaSources 
    ? mediaSources.every(s => (s.config as any)?.loop ?? true)
    : true;

  const isLoopLocked = isBroadcastLocked || effectiveState !== 'OFFLINE';

  const handleToggleLoop = () => {
    if (isLoopLocked || !hasMediaSources) return;
    const nextLoop = !isLooping;
    mediaSources.forEach((s) => {
      const currentConfig = (s.config as Record<string, any>) || {};
      updateSource(s.id, {
        config: { ...currentConfig, loop: nextLoop }
      });
    });
  };

  const { data: streams = [] } = useStreams();
  const activeStream = streams.find(
    (s) => s.status !== "completed" && s.status !== "cancelled" && s.status !== "error"
  );

  // Authoritative destination & health status badge
  const destinationBadge = (() => {
    if (!activeDestId) return { text: "No Destination", color: "text-text-muted", dot: "bg-text-muted" };
    if (effectiveState === 'PREPARING') return { text: "Preparing...", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" };
    if (effectiveState === 'STARTING') return { text: "Connecting...", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" };
    if (effectiveState === 'LIVE') {
      const health = activeStream?.stream_analytics?.[0]?.health;
      if (health === 'NO_SIGNAL') return { text: "No Signal", color: "text-status-error", dot: "bg-status-error animate-ping" };
      if (health === 'DEGRADED') return { text: "Unstable", color: "text-amber-400", dot: "bg-amber-400" };
      return { text: "Video Flowing", color: "text-status-success", dot: "bg-status-success" };
    }
    if (effectiveState === 'RECONNECTING') return { text: "Reconnecting...", color: "text-amber-400", dot: "bg-amber-400 animate-pulse" };
    if (effectiveState === 'STOPPING') return { text: "Ending...", color: "text-amber-400", dot: "bg-amber-400" };
    return { text: "Destination Configured", color: "text-text-secondary", dot: "bg-accent" };
  })();

  // ── Authoritative Preflight & Snapshot Integrity Validations ──
  const isSceneValid = Boolean(sceneName && sceneName.trim().length > 0);
  const hasSources = sources.length > 0;
  const isTitleConfigured = Boolean(streamTitle && streamTitle.trim().length > 0);
  const isDestinationConfigured = Boolean(activeDestId);
  const isOutputValid = Boolean(selectedProfile);

  const snapshotValidation = validateSceneSnapshot({
    scene: {
      id: useStudioStore.getState().sceneId || "temp",
      name: sceneName || "Untitled Scene",
      width: useStudioStore.getState().sceneWidth,
      height: useStudioStore.getState().sceneHeight,
      fps: useStudioStore.getState().sceneFps,
    },
    sources: sources.map((s) => ({
      ...s,
      media_path: (s.config as any)?.filePath || null,
    })),
    destinationId: activeDestId,
  });

  const isSnapshotValid = hasSources && snapshotValidation.isValid;
  const isStudioReady = studioLoadingState === 'READY';

  const isReadyToStream = 
    isStudioReady &&
    isSceneValid && 
    hasSources && 
    isSnapshotValid &&
    isTitleConfigured && 
    isDestinationConfigured && 
    isOutputValid && 
    effectiveState === 'OFFLINE';

  // Missing items count
  const missingItems: string[] = [];
  if (studioLoadingState === 'LOADING_SCENE' || studioLoadingState === 'INITIALIZING') {
    missingItems.push("Scene layers are still loading");
  }
  if (!hasSources) {
    missingItems.push("Add at least 1 video or layer");
  } else if (!isSnapshotValid) {
    missingItems.push(snapshotValidation.errors[0] || "Scene snapshot contains invalid layers");
  }
  if (!isTitleConfigured) missingItems.push("Add a broadcast title");
  if (!isDestinationConfigured) missingItems.push("Connect YouTube stream key");

  const [startError, setStartError] = useState("");

  const handleStart = async () => {
    if (!isReadyToStream || isSubmitting) return;
    setIsSubmitting(true);
    setStartError("");
    try {
      await onStartStream({
        title: streamTitle.trim() || sceneName || "Live Stream Broadcast",
        description: streamDescription.trim(),
        destinationId: activeDestId,
        resolution: selectedProfile.resolution,
        fps: selectedProfile.fps,
      });
    } catch (err: any) {
      console.error("[StreamConfig] Start broadcast failed:", err);
      setStartError(err?.message || "Failed to start broadcast. Please verify your destination connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");
    setSaveSuccessMsg("");

    const key = streamKeyInput.trim();
    if (!key) {
      setKeyError("Please enter your YouTube stream key.");
      return;
    }

    try {
      const secretId = await createDestination.mutateAsync({
        platform: "youtube",
        streamKey: key,
        label: destLabelInput.trim() || "YouTube Live",
      });

      setSelectedDestId(secretId);
      setSaveSuccessMsg("YouTube stream key connected securely!");
      setTimeout(() => {
        setIsKeyModalOpen(false);
        setStreamKeyInput("");
        setDestLabelInput("");
        setShowStreamKey(false);
        setSaveSuccessMsg("");
      }, 1000);
    } catch (err: any) {
      // Friendly error handling
      if (err.message?.includes("duplicate") || err.message?.includes("secrets_name_idx")) {
        setKeyError("A destination with this name already exists. You can use your existing saved destination or provide a unique label.");
      } else {
        setKeyError(err.message || "Failed to save stream key. Please try again.");
      }
    }
  };

  return (
    <div className="border-t border-border bg-surface-1 shrink-0 flex flex-col transition-all z-20 shadow-lg">
      {/* ── Collapsed / Always-Visible Creator Broadcast Bar ── */}
      <div className="px-4 py-2.5 bg-surface-1 flex items-center justify-between gap-4 border-b border-border/50">
        {/* Left: Broadcast Summary Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleBottomPanel}
            className="flex items-center gap-2 text-xs font-bold text-text-primary hover:text-accent transition-colors shrink-0"
            title={isBottomCollapsed ? "Open Broadcast Settings" : "Close Broadcast Settings"}
          >
            <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
              <Tv className="w-4 h-4" />
            </div>
            <span className="tracking-wide">BROADCAST</span>
            {isBottomCollapsed ? <ChevronUp className="w-3.5 h-3.5 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
          </button>

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

          {/* Quick Info Badges */}
          <div className="flex items-center gap-2 text-xs text-text-secondary truncate">
            <span className="font-semibold text-text-primary truncate max-w-[180px] sm:max-w-[260px]">
              {streamTitle || "Untitled Broadcast"}
            </span>
            <span className="hidden md:inline text-text-muted">&bull;</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-text-secondary">
              <Youtube className="w-3.5 h-3.5 text-status-live shrink-0" />
              <span className={`w-1.5 h-1.5 rounded-full ${destinationBadge.dot}`} />
              <span className={destinationBadge.color}>{destinationBadge.text}</span>
            </span>
            <span className="hidden lg:inline text-text-muted">&bull;</span>
            <span className="hidden lg:inline font-mono text-[11px] bg-surface-2 px-2 py-0.5 rounded border border-border">
              {sceneRatio} &bull; {selectedProfile.label.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Right: Loop Media Control, Readiness Badge & Primary Action CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Creator Loop Media Interactive Control */}
          <div className="relative group shrink-0">
            <button
              type="button"
              role="switch"
              id="broadcast-loop-toggle"
              aria-checked={isLooping}
              aria-label={`Media loop is ${isLooping ? 'ON' : 'OFF'}${isLoopLocked ? ' (locked to launch snapshot)' : ''}`}
              disabled={isLoopLocked || !hasMediaSources}
              onClick={handleToggleLoop}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                isLoopLocked
                  ? "bg-surface-2/80 border-border/80 text-text-muted cursor-not-allowed opacity-85"
                  : !hasMediaSources
                  ? "bg-surface-2 border-border text-text-muted cursor-not-allowed opacity-50"
                  : isLooping
                  ? "bg-accent/15 hover:bg-accent/25 border-accent/40 text-accent-light shadow-sm cursor-pointer"
                  : "bg-surface-2 hover:bg-surface-3 border-border text-text-secondary hover:text-text-primary cursor-pointer"
              }`}
              title={
                isLoopLocked
                  ? `Media loop is ${isLooping ? 'ON' : 'OFF'} (Locked: active broadcast is running the launch snapshot)`
                  : !hasMediaSources
                  ? "Add a video or audio layer to enable looping"
                  : `Click to turn media looping ${isLooping ? 'OFF' : 'ON'}`
              }
            >
              <Repeat className={`w-3.5 h-3.5 ${isLooping ? "text-accent" : "text-text-muted"}`} />
              <span className="font-medium text-text-primary hidden xs:inline">Loop Media</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition-colors ${
                  isLooping
                    ? "bg-accent text-white shadow-xs"
                    : "bg-surface-3 text-text-muted border border-border/50"
                }`}
              >
                {isLooping ? "ON" : "OFF"}
              </span>
              {isLoopLocked && (
                <Lock className="w-3 h-3 text-amber-400 shrink-0 ml-0.5" />
              )}
            </button>

            {/* Hover Tooltip when locked */}
            {isLoopLocked && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                <div className="bg-surface-3 border border-border text-text-secondary text-[10px] rounded px-2.5 py-1 shadow-lg whitespace-nowrap text-center">
                  <span className="text-amber-400 font-semibold block">Using launch snapshot</span>
                  <span>Loop settings locked for active broadcast</span>
                </div>
                <div className="w-2 h-1 bg-surface-3 border-r border-b border-border rotate-45 -mt-0.5"></div>
              </div>
            )}
          </div>
          {effectiveState === 'LIVE' ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-status-live bg-status-live-bg px-2.5 py-1 rounded-full animate-pulse border border-status-live/20">
                <Radio className="w-3.5 h-3.5" /> LIVE BROADCAST
              </span>
              <Button 
                variant="danger" 
                size="sm"
                className="font-bold shadow-sm" 
                onClick={onStopStream}
              >
                <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Stop Stream
              </Button>
            </div>
          ) : effectiveState === 'RECONNECTING' ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> RECONNECTING...
              </span>
              <Button 
                variant="danger" 
                size="sm"
                className="font-bold shadow-sm" 
                onClick={onStopStream}
              >
                <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Stop Broadcast
              </Button>
            </div>
          ) : effectiveState === 'PREPARING' || isSubmitting ? (
            <Button variant="secondary" size="sm" disabled className="font-semibold">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-accent" />
              Preparing...
            </Button>
          ) : effectiveState === 'STARTING' ? (
            <Button variant="secondary" size="sm" disabled className="font-semibold">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-accent" />
              Starting Broadcast...
            </Button>
          ) : effectiveState === 'STOPPING' ? (
            <Button variant="secondary" size="sm" disabled className="font-semibold">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-accent" />
              Ending Broadcast...
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {!isReadyToStream && (
                <button
                  type="button"
                  onClick={() => {
                    if (isBottomCollapsed) toggleBottomPanel();
                    setActiveTab("check");
                  }}
                  className="hidden sm:flex items-center gap-1 text-xs font-semibold text-status-warning bg-status-warning-bg hover:bg-status-warning-bg/80 px-2.5 py-1 rounded-lg border border-status-warning/30 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{missingItems.length} item{missingItems.length > 1 ? "s" : ""} needed</span>
                </button>
              )}

              {isReadyToStream && (
                <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-status-success bg-status-success-bg px-2.5 py-1 rounded-lg border border-status-success/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0" />
                  <span>Ready to Stream</span>
                </span>
              )}

              <Button 
                variant="primary" 
                size="sm"
                className="font-bold px-4 shadow-sm" 
                disabled={!isReadyToStream || isSubmitting}
                onClick={handleStart}
              >
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                Start Stream
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded Drawer Content ── */}
      {!isBottomCollapsed && (
        <div className="p-4 bg-surface-1 border-t border-border/50 animate-in slide-in-from-bottom-2 duration-200">
          {startError && (
            <div className="mb-4 p-3 bg-status-error-bg/20 border border-status-error/30 rounded-xl flex items-center justify-between text-xs text-status-error animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{startError}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setStartError("")}
                className="text-status-error/70 hover:text-status-error font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Drawer Navigation Tabs (Clean unnumbered labels U-07) */}
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "info" 
                  ? "bg-accent/10 text-accent-light border border-accent/20 shadow-sm" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Basics</span>
              {isTitleConfigured && <span className="text-[10px] text-status-success font-bold">✓</span>}
            </button>

            <button
              onClick={() => setActiveTab("destination")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "destination" 
                  ? "bg-accent/10 text-accent-light border border-accent/20 shadow-sm" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-status-live" />
              <span>Destination</span>
              {isDestinationConfigured && <span className="text-[10px] text-status-success font-bold">✓</span>}
            </button>

            <button
              onClick={() => setActiveTab("output")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "output" 
                  ? "bg-accent/10 text-accent-light border border-accent/20 shadow-sm" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Quality</span>
            </button>

            <button
              onClick={() => setActiveTab("check")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "check" 
                  ? "bg-accent/10 text-accent-light border border-accent/20 shadow-sm" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Readiness</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isReadyToStream ? "bg-status-success-bg text-status-success" : "bg-status-warning-bg text-status-warning"
              }`}>
                {isReadyToStream ? "Ready" : missingItems.length}
              </span>
            </button>
          </div>

          {/* TAB 1: Stream Information */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">Broadcast Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 24/7 Relaxing Music Radio • Lofi Beats to Study/Chill" 
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary mb-1 block">Stream Description (Optional)</label>
                  <textarea 
                    placeholder="Add details, links, or credits for your viewers on YouTube..." 
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    className="w-full h-16 bg-surface-2 border border-border rounded-xl p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent outline-none resize-none"
                  />
                </div>

                {/* Continuous 24/7 Loop Setting */}
                <div className="p-3 bg-surface-2/80 rounded-xl border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isLooping ? 'bg-accent/10 text-accent' : 'bg-surface-3 text-text-muted'}`}>
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <span>Loop Media for 24/7 Broadcast</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          isLooping ? 'bg-accent/20 text-accent' : 'bg-surface-3 text-text-muted'
                        }`}>
                          {isLooping ? 'ON' : 'OFF'}
                        </span>
                        {isLoopLocked && (
                          <span className="text-[10px] text-amber-400 font-normal flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate">
                        {isLooping 
                          ? "Video and audio files continuously loop for uninterrupted streaming." 
                          : "Media plays once and freezes on the final frame."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLooping}
                    disabled={isLoopLocked || !hasMediaSources}
                    onClick={handleToggleLoop}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                      isLoopLocked
                        ? "bg-surface-3 text-text-muted border border-border cursor-not-allowed opacity-60"
                        : !hasMediaSources
                        ? "bg-surface-3 text-text-muted border border-border cursor-not-allowed opacity-50"
                        : isLooping
                        ? "bg-accent text-white hover:bg-accent-hover shadow-xs cursor-pointer"
                        : "bg-surface-3 hover:bg-surface-2 border border-border text-text-secondary hover:text-text-primary cursor-pointer"
                    }`}
                  >
                    {isLooping ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Custom Thumbnail</label>
                <div className="p-3 bg-surface-2 rounded-xl border border-border flex flex-col items-center justify-center gap-2 text-center">
                  {thumbnailUrl ? (
                    <div className="w-full h-24 bg-surface-3 rounded-lg overflow-hidden border border-border relative">
                      <MediaPreview filePath={thumbnailUrl} fileType="image" />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-surface-3/50 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-text-muted gap-1">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                      <span className="text-[11px]">No thumbnail selected</span>
                    </div>
                  )}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full text-xs" 
                    onClick={onSelectThumbnail}
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                    {thumbnailUrl ? "Change Thumbnail" : "Upload / Choose Thumbnail"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Destination */}
          {activeTab === "destination" && (
            <div className="max-w-xl space-y-4">
              <div className="p-4 bg-surface-2 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-status-live" />
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">YouTube Live Stream</h4>
                      <p className="text-xs text-text-secondary">Stream 24/7 directly to your YouTube channel</p>
                    </div>
                  </div>

                  {isDestinationConfigured && (
                    <span className="flex items-center gap-1 text-xs font-bold text-status-success bg-status-success-bg px-2.5 py-1 rounded-full border border-status-success/30">
                      <Check className="w-3.5 h-3.5" /> Destination Configured
                    </span>
                  )}
                </div>

                {isLoadingDestinations ? (
                  <div className="text-xs text-text-muted py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading saved destinations...
                  </div>
                ) : savedDestinations.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-secondary block">Select YouTube Channel / Stream Key</label>
                    <select 
                      value={activeDestId}
                      onChange={(e) => setSelectedDestId(e.target.value)}
                      className="w-full bg-surface-1 border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent font-medium cursor-pointer"
                    >
                      {savedDestinations.map((d, i) => (
                        <option key={d.id || i} value={d.secret_id}>
                          YouTube Live ({d.secret_id.substring(0, 10)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-3/50 rounded-xl text-xs text-text-secondary border border-border/80">
                    No YouTube Stream Key connected yet. Connect your key to broadcast.
                  </div>
                )}

                <Button 
                  variant="primary" 
                  size="sm" 
                  className="w-full font-semibold" 
                  onClick={() => setIsKeyModalOpen(true)}
                >
                  <Key className="w-3.5 h-3.5 mr-1.5" />
                  {savedDestinations.length > 0 ? "Update or Add New Stream Key" : "Connect YouTube Stream Key"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: Output & Video Quality */}
          {activeTab === "output" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div className="p-4 bg-surface-2 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Canvas Format & Ratio</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RATIO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSceneRatio(preset.id as AspectRatio)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        sceneRatio === preset.id
                          ? "bg-accent/10 border-accent text-text-primary shadow-sm"
                          : "bg-surface-1 border-border text-text-secondary hover:text-text-primary hover:border-border/80"
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.id}</div>
                      <div className="text-[11px] text-text-muted truncate">{preset.label.split("—")[1]?.trim() || preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-surface-2 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Video Quality Preset</h4>
                <div className="space-y-2">
                  {TESTED_OUTPUT_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setSelectedProfileId(profile.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedProfileId === profile.id
                          ? "bg-accent/10 border-accent text-text-primary shadow-sm"
                          : "bg-surface-1 border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{profile.label}</div>
                        <div className="text-[11px] text-text-muted">Target Bitrate: {profile.bitrate}</div>
                      </div>
                      {selectedProfileId === profile.id && <Check className="w-4 h-4 text-accent" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Readiness Check (U-08: 1 blocker -> 1 action) */}
          {activeTab === "check" && (
            <div className="max-w-2xl space-y-3">
              <div className="p-4 bg-surface-2 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      {isReadyToStream ? "Ready to Go" : "Broadcast Checklist"}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {isReadyToStream ? "All settings verified. You can start streaming." : `${missingItems.length} item(s) needed before starting`}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isReadyToStream ? "bg-status-success-bg text-status-success" : "bg-status-warning-bg text-status-warning"
                  }`}>
                    {isReadyToStream ? "✓ Ready" : "Action Required"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Scene Check */}
                  <div className="p-2.5 bg-surface-1 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isSceneValid ? <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" /> : <AlertCircle className="w-4 h-4 text-status-error shrink-0" />}
                      <div>
                        <div className="font-semibold text-text-primary">Scene Configured</div>
                        <div className="text-[11px] text-text-muted">{sceneName || "Untitled Scene"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sources Check */}
                  <div className="p-2.5 bg-surface-1 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {hasSources ? <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" /> : <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />}
                      <div>
                        <div className="font-semibold text-text-primary">Video / Media Layers</div>
                        <div className="text-[11px] text-text-muted">{hasSources ? `${sources.length} active layer(s)` : "No media added yet"}</div>
                      </div>
                    </div>
                    {!hasSources && (
                      <span className="text-[11px] text-accent font-semibold">Add media via Sources panel</span>
                    )}
                  </div>

                  {/* Title Check */}
                  <div className="p-2.5 bg-surface-1 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isTitleConfigured ? <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" /> : <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />}
                      <div>
                        <div className="font-semibold text-text-primary">Broadcast Title</div>
                        <div className="text-[11px] text-text-muted">{isTitleConfigured ? streamTitle : "Please provide a broadcast title"}</div>
                      </div>
                    </div>
                    {!isTitleConfigured && (
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("info")} 
                        className="text-[11px] font-semibold text-accent hover:underline"
                      >
                        Add Title
                      </button>
                    )}
                  </div>

                  {/* Destination Check */}
                  <div className="p-2.5 bg-surface-1 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isDestinationConfigured ? <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" /> : <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />}
                      <div>
                        <div className="font-semibold text-text-primary">YouTube Destination</div>
                        <div className="text-[11px] text-text-muted">{isDestinationConfigured ? "Destination Configured & Ready" : "YouTube stream key not configured"}</div>
                      </div>
                    </div>
                    {!isDestinationConfigured && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="text-[11px] py-1 px-2.5"
                        onClick={() => setIsKeyModalOpen(true)}
                      >
                        Connect YouTube
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stream Key Modal ── */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-1 border border-border rounded-2xl shadow-popover w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Youtube className="w-5 h-5 text-status-live" />
                Connect YouTube Stream Key
              </h3>
              <button 
                onClick={() => {
                  setIsKeyModalOpen(false);
                  setKeyError("");
                  setSaveSuccessMsg("");
                }}
                className="text-text-muted hover:text-text-primary text-sm font-bold p-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Paste the stream key from your YouTube Studio Live Control Room. It will be stored securely for your broadcasts.
            </p>

            <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-normal">
                Your key is encrypted with AES-256 and never shared or displayed again.
              </p>
            </div>

            {keyError && (
              <div className="p-3 bg-status-error-bg border border-status-error/30 text-status-error text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-status-error" />
                <span className="leading-snug">{keyError}</span>
              </div>
            )}

            {saveSuccessMsg && (
              <div className="p-3 bg-status-success-bg border border-status-success/30 text-status-success text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-status-success" />
                <span className="font-semibold">{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Destination Label (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. My YouTube Channel"
                  value={destLabelInput}
                  onChange={(e) => setDestLabelInput(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-accent font-medium placeholder:text-text-muted"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">YouTube Stream Key *</label>
                <div className="relative">
                  <input 
                    type={showStreamKey ? "text" : "password"}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                    value={streamKeyInput}
                    onChange={(e) => setStreamKeyInput(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 pr-10 text-xs text-text-primary font-mono outline-none focus:border-accent placeholder:text-text-muted"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1"
                  >
                    {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => {
                    setIsKeyModalOpen(false);
                    setKeyError("");
                    setSaveSuccessMsg("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={createDestination.isPending || !!saveSuccessMsg}
                >
                  {createDestination.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving Securely...
                    </>
                  ) : saveSuccessMsg ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Destination Saved
                    </>
                  ) : (
                    "Save Stream Key"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
