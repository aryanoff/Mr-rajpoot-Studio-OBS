import { useEffect, useRef, useState } from "react";
import { useStreams, useStopStream, useCreateStream } from "../../features/streams/streams.hooks";
import { useSaveScene, useScenes } from "../../features/studio/studio.hooks";
import { useStudioStore } from "../../stores/studio.store";
import { validateSceneSnapshot } from "../../features/studio/snapshotValidator";
import StudioCanvas from "../../components/studio/StudioCanvas";
import MediaPickerModal from "../../components/studio/MediaPickerModal";
import Inspector from "../../components/studio/Inspector";
import SourceList from "../../components/studio/SourceList";
import SceneList from "../../components/studio/SceneList";
import StreamConfig, { type BroadcastState } from "../../components/studio/StreamConfig";
import Badge from "../../components/ui/Badge";
import { useDebounce } from "../../hooks/useDebounce";
import { calculateMediaFit } from "../../features/studio/studio.constants";
import { Undo2, Redo2, Edit3, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, RefreshCw, Lock } from "lucide-react";

import { useAuthStore } from "../../stores/auth.store";

const EMPTY_SCENES: any[] = [];

export default function Studio() {
  const user = useAuthStore((state) => state.user);
  const { data: streams = [] } = useStreams();
  const { data: scenes = EMPTY_SCENES, isLoading: isScenesLoading, isError: isScenesError } = useScenes();
  const stopStream = useStopStream();
  const saveScene = useSaveScene();
  const createStream = useCreateStream();

  // Find active stream for the current user
  const activeStream = streams.find(
    (s) => s.user_id === user?.id && s.status !== "completed" && s.status !== "cancelled" && s.status !== "error"
  );

  // Authoritative Deterministic Broadcast State Mapping
  let broadcastState: BroadcastState = "OFFLINE";
  if (createStream.isPending) {
    broadcastState = "PREPARING";
  } else if (activeStream) {
    const status = activeStream.status as string;
    if (status === "queued") broadcastState = "PREPARING";
    else if (status === "starting") broadcastState = "STARTING";
    else if (status === "live") broadcastState = "LIVE";
    else if (status === "reconnecting") broadcastState = "RECONNECTING";
    else if (status === "stopping") broadcastState = "STOPPING";
    else broadcastState = "OFFLINE";
  }

  // Broadcast Lock Mode (Freezes mutations during active streams: STARTING, LIVE, RECONNECTING, STOPPING)
  const isBroadcastLocked = 
    broadcastState === "STARTING" || 
    broadcastState === "LIVE" || 
    broadcastState === "RECONNECTING" || 
    broadcastState === "STOPPING";

  const isLive = broadcastState === "LIVE";
  const isStarting = broadcastState === "STARTING" || broadcastState === "PREPARING";

  // Narrow Zustand selectors (prevents whole-store subscription rerenders)
  const sceneId = useStudioStore((s) => s.sceneId);
  const sceneWidth = useStudioStore((s) => s.sceneWidth);
  const sceneName = useStudioStore((s) => s.sceneName);
  const setSceneName = useStudioStore((s) => s.setSceneName);
  const sources = useStudioStore((s) => s.sources);
  const addSource = useStudioStore((s) => s.addSource);
  const removeSource = useStudioStore((s) => s.removeSource);
  const selectedSourceId = useStudioStore((s) => s.selectedSourceId);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const historyIndex = useStudioStore((s) => s.historyIndex);
  const history = useStudioStore((s) => s.history);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const editorMode = useStudioStore((s) => s.editorMode);
  const setEditorMode = useStudioStore((s) => s.setEditorMode);
  const isLeftPanelCollapsed = useStudioStore((s) => s.isLeftPanelCollapsed);
  const isRightPanelCollapsed = useStudioStore((s) => s.isRightPanelCollapsed);
  const toggleLeftPanel = useStudioStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useStudioStore((s) => s.toggleRightPanel);
  const streamThumbnail = useStudioStore((s) => s.streamThumbnail);
  const setStreamThumbnail = useStudioStore((s) => s.setStreamThumbnail);
  const setIsBroadcastLocked = useStudioStore((s) => s.setIsBroadcastLocked);
  const setScene = useStudioStore((s) => s.setScene);
  const setStudioLoadingState = useStudioStore((s) => s.setStudioLoadingState);

  // Authoritative Studio Loading & Initial Scene Coordination
  useEffect(() => {
    if (isScenesLoading) {
      setStudioLoadingState("LOADING_SCENE");
    } else if (isScenesError) {
      setStudioLoadingState("ERROR");
    } else if (scenes.length === 0) {
      setStudioLoadingState("EMPTY");
    } else if (!sceneId && scenes.length > 0) {
      setScene(scenes[0], scenes[0].scene_sources || []);
    }
  }, [isScenesLoading, isScenesError, scenes, sceneId, setScene, setStudioLoadingState]);

  // Synchronize broadcast lock into store
  useEffect(() => {
    setIsBroadcastLocked(isBroadcastLocked);
  }, [isBroadcastLocked, setIsBroadcastLocked]);

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [pickerMediaType, setPickerMediaType] = useState<"video" | "image" | "audio" | null>(null);
  const [pickerPurpose, setPickerPurpose] = useState<"source" | "thumbnail">("source");
  const [isEditingSceneName, setIsEditingSceneName] = useState(false);
  const [tempSceneName, setTempSceneName] = useState("");

  // ── Autosave Logic (Disabled during active broadcast lock) ──
  const debouncedHistoryIndex = useDebounce(historyIndex, 750);
  const prevHistoryRef = useRef(debouncedHistoryIndex);

  useEffect(() => {
    if (debouncedHistoryIndex !== prevHistoryRef.current) {
      prevHistoryRef.current = debouncedHistoryIndex;
      if (saveStatus === 'unsaved' && !isBroadcastLocked) {
        saveScene.mutate(useStudioStore.getState());
      }
    }
  }, [debouncedHistoryIndex, saveStatus, saveScene, isBroadcastLocked]);

  // ── Stream Start Handler (Immutable Snapshot Creation & Integrity Gate) ──
  const handleStartStream = async (config: any) => {
    if (isBroadcastLocked) {
      throw new Error("A broadcast is already active or in transition.");
    }

    // 1. Flush any pending scene saves
    const scene = await saveScene.mutateAsync(useStudioStore.getState());
    
    // 2. Build immutable snapshot payload
    const snapshotPayload = {
      scene: {
        id: scene.id,
        name: scene.name,
        width: scene.width,
        height: scene.height,
        fps: scene.fps,
        background: scene.background
      },
      sources: useStudioStore.getState().sources.map((s) => ({
        id: s.id,
        media_id: s.media_id,
        type: s.type,
        name: s.name,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        rotation: s.rotation || 0,
        opacity: s.opacity ?? 1,
        z_index: s.z_index,
        visible: s.visible,
        locked: s.locked,
        config: s.config || {},
        media_path: (s.config as any)?.filePath || null
      })),
      output: {
        resolution: config.resolution,
        fps: config.fps,
        ratio: useStudioStore.getState().sceneRatio
      },
      destinationId: config.destinationId,
      startedAt: new Date().toISOString()
    };

    // 3. Preflight Snapshot Integrity Gate
    const validation = validateSceneSnapshot(snapshotPayload);
    if (!validation.isValid) {
      throw new Error(`Cannot start broadcast: ${validation.errors.join("; ")}`);
    }

    // 4. Create live stream record with snapshot
    await createStream.mutateAsync({
      title: config.title || scene.name || "Live Stream Broadcast",
      platform: "youtube",
      secretId: config.destinationId,
      resolution: config.resolution,
      fps: config.fps,
      sceneId: scene.id,
      sceneSnapshot: snapshotPayload
    });
  };

  const handleStopStream = async () => {
    if (activeStream && activeStream.status !== "stopping" && !stopStream.isPending) {
      await stopStream.mutateAsync(activeStream.id);
    }
  };

  const handleAddText = () => {
    addSource({
      id: crypto.randomUUID(),
      scene_id: sceneId || 'temp',
      type: 'text',
      name: 'Text Layer',
      x: 80,
      y: 80,
      width: 500,
      height: 120,
      rotation: 0,
      opacity: 1,
      z_index: sources.length,
      visible: true,
      locked: false,
      config: { content: 'Double click to edit text', fontSize: 56, color: '#ffffff', align: 'center' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  };

  const handleAddOverlay = () => {
    addSource({
      id: crypto.randomUUID(),
      scene_id: sceneId || 'temp',
      type: 'overlay',
      name: 'Color Overlay',
      x: 0,
      y: 0,
      width: sceneWidth,
      height: 160,
      rotation: 0,
      opacity: 0.6,
      z_index: sources.length,
      visible: true,
      locked: false,
      config: { color: '#000000' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  };

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBroadcastLocked) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveScene.mutate(useStudioStore.getState());
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = document.activeElement?.tagName;
        if (target !== 'INPUT' && target !== 'TEXTAREA' && selectedSourceId) {
          removeSource(selectedSourceId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedSourceId, removeSource, saveScene, isBroadcastLocked]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 -mb-4 -mt-4 bg-background overflow-hidden select-none">
      {/* ── Studio Top Header ── */}
      <div className="h-14 border-b border-border bg-surface-1 flex items-center justify-between px-4 shrink-0 z-20">
        {/* Left: Scene Name & Status */}
        <div className="flex items-center gap-3 min-w-0">
          {isEditingSceneName ? (
            <input
              type="text"
              value={tempSceneName}
              onChange={(e) => setTempSceneName(e.target.value)}
              onBlur={() => {
                if (tempSceneName.trim()) setSceneName(tempSceneName.trim());
                setIsEditingSceneName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempSceneName.trim()) setSceneName(tempSceneName.trim());
                  setIsEditingSceneName(false);
                }
                if (e.key === 'Escape') {
                  setTempSceneName(sceneName);
                  setIsEditingSceneName(false);
                }
              }}
              autoFocus
              className="font-bold text-sm bg-surface-2 border border-accent rounded px-2 py-1 text-text-primary outline-none"
            />
          ) : (
            <button
              onClick={() => {
                if (isBroadcastLocked) return;
                setTempSceneName(sceneName);
                setIsEditingSceneName(true);
              }}
              disabled={isBroadcastLocked}
              className="flex items-center gap-1.5 font-bold text-sm text-text-primary hover:text-accent transition-colors truncate text-left disabled:opacity-80 disabled:cursor-not-allowed"
              title={isBroadcastLocked ? "Scene locked during broadcast" : "Click to rename scene"}
            >
              <span className="truncate">{sceneName || "Untitled Scene"}</span>
              {!isBroadcastLocked && <Edit3 className="w-3.5 h-3.5 opacity-50 shrink-0" />}
            </button>
          )}

          <Badge 
            variant={
              broadcastState === 'LIVE' ? (
                activeStream?.stream_analytics?.[0]?.health === "NO_SIGNAL" ? "error"
                : (activeStream?.stream_analytics?.[0]?.health === "DEGRADED" || (activeStream?.stream_analytics?.[0]?.avg_bitrate_kbps && activeStream.stream_analytics[0].avg_bitrate_kbps < 800)) ? "warning"
                : "live"
              )
              : (broadcastState === 'RECONNECTING' || broadcastState === 'STARTING' || broadcastState === 'PREPARING' || broadcastState === 'STOPPING') ? "warning"
              : "offline"
            } 
            size="sm"
          >
            {broadcastState === 'LIVE' 
              ? (
                  activeStream?.stream_analytics?.[0]?.health === "NO_SIGNAL" 
                    ? "⚠ NO SIGNAL — YOUTUBE NOT RECEIVING" 
                    : (activeStream?.stream_analytics?.[0]?.health === "DEGRADED" || (activeStream?.stream_analytics?.[0]?.avg_bitrate_kbps && activeStream.stream_analytics[0].avg_bitrate_kbps < 800)) 
                      ? "⚠ LIVE — UNSTABLE" 
                      : "● LIVE — GOOD"
                ) 
              : broadcastState === 'RECONNECTING' ? "↻ Reconnecting..." 
              : broadcastState === 'PREPARING' ? "Preparing Broadcast..."
              : broadcastState === 'STARTING' ? "Starting Stream..." 
              : broadcastState === 'STOPPING' ? "Ending Broadcast..." 
              : "Offline"}
          </Badge>

          {/* Live Telemetry Info */}
          {broadcastState === 'LIVE' && activeStream?.stream_analytics?.[0] && (
            <span className="hidden md:inline-flex items-center gap-2 text-xs font-mono text-text-secondary bg-surface-2 px-2.5 py-0.5 rounded-lg border border-border">
              <span className={activeStream.stream_analytics[0].avg_bitrate_kbps < 800 ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
                {(activeStream.stream_analytics[0].avg_bitrate_kbps / 1000).toFixed(1)} Mbps
              </span>
              <span className="text-text-muted">&bull;</span>
              <span className="font-semibold text-text-primary">
                {activeStream.stream_analytics[0].current_fps ? `${activeStream.stream_analytics[0].current_fps} FPS` : `${activeStream.fps || 30} FPS`}
              </span>
              <span className="text-text-muted">&bull;</span>
              <span>{new Date((activeStream.stream_analytics[0].uptime_seconds || 0) * 1000).toISOString().substring(11, 19)}</span>
            </span>
          )}
        </div>

        {/* Right: Actions, History & Mode Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Save status badge */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && !isBroadcastLocked && <RefreshCw className="w-3 h-3 animate-spin text-accent" />}
            {isBroadcastLocked && <Lock className="w-3 h-3 text-amber-400" />}
            <span className={`font-medium ${isBroadcastLocked ? 'text-amber-400' : saveStatus === 'saved' ? 'text-status-success' : saveStatus === 'saving' ? 'text-accent' : saveStatus === 'error' ? 'text-status-error' : 'text-text-muted'}`}>
              {isBroadcastLocked 
                ? 'Live Snapshot Locked' 
                : saveStatus === 'saved' 
                  ? 'Saved' 
                  : saveStatus === 'saving' 
                    ? 'Saving...' 
                    : saveStatus === 'error' 
                      ? 'Save Failed' 
                      : 'Unsaved'}
            </span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={isBroadcastLocked || historyIndex === 0}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title={isBroadcastLocked ? "Undo locked during broadcast" : "Undo (Ctrl+Z)"}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={isBroadcastLocked || historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title={isBroadcastLocked ? "Redo locked during broadcast" : "Redo (Ctrl+Shift+Z)"}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Editor / Preview Switcher */}
          <div className="flex bg-surface-2 rounded-xl p-0.5 border border-border">
            <button
              onClick={() => setEditorMode('editor')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                editorMode === 'editor' 
                  ? 'bg-surface-1 text-text-primary shadow-sm border border-border/50' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setEditorMode('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                editorMode === 'preview' 
                  ? 'bg-surface-1 text-text-primary shadow-sm border border-border/50' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Area ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex overflow-hidden">
          
          {/* Left Panel: Scenes & Sources */}
          {!isLeftPanelCollapsed ? (
            <div className="w-56 lg:w-64 flex flex-col border-r border-border shrink-0 bg-surface-1 z-10 transition-all">
              <SceneList />
              <SourceList 
                onAddMedia={(type) => {
                  setPickerPurpose("source");
                  setPickerMediaType(type);
                  setIsMediaPickerOpen(true);
                }}
                onAddText={handleAddText}
                onAddOverlay={handleAddOverlay}
              />
            </div>
          ) : (
            <button
              onClick={toggleLeftPanel}
              className="w-8 border-r border-border bg-surface-1 hover:bg-surface-2 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-primary transition-colors z-10 shrink-0"
              title="Expand Scenes & Sources"
            >
              <PanelLeftOpen className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider [writing-mode:vertical-lr]">Layers</span>
            </button>
          )}

          {/* Center Panel: Dominant Canvas */}
          <div className="flex-1 min-w-0 bg-background p-2.5 sm:p-3 relative overflow-hidden flex flex-col">
            {/* Quick Panel Toggle Overlay */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button
                onClick={toggleLeftPanel}
                className="p-1.5 rounded-lg bg-surface-1/90 backdrop-blur border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
                title={isLeftPanelCollapsed ? "Show Left Panel" : "Hide Left Panel"}
              >
                {isLeftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={toggleRightPanel}
                className="p-1.5 rounded-lg bg-surface-1/90 backdrop-blur border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
                title={isRightPanelCollapsed ? "Show Inspector" : "Hide Inspector"}
              >
                {isRightPanelCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center">
              <StudioCanvas />
            </div>
          </div>

          {/* Right Panel: Contextual Inspector */}
          {!isRightPanelCollapsed ? (
            <div className="w-60 lg:w-72 shrink-0 bg-surface-1 border-l border-border z-10 transition-all">
              <Inspector />
            </div>
          ) : (
            <button
              onClick={toggleRightPanel}
              className="w-8 border-l border-border bg-surface-1 hover:bg-surface-2 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-primary transition-colors z-10 shrink-0"
              title="Expand Inspector"
            >
              <PanelRightOpen className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider [writing-mode:vertical-lr]">Inspector</span>
            </button>
          )}

        </div>

        {/* Bottom Panel: Stream Configuration & Readiness Check */}
        <StreamConfig 
          onStartStream={handleStartStream}
          broadcastState={broadcastState}
          isStarting={isStarting}
          isLive={isLive}
          onStopStream={handleStopStream}
          thumbnailUrl={streamThumbnail}
          onSelectThumbnail={() => {
            if (isBroadcastLocked) return;
            setPickerPurpose("thumbnail");
            setPickerMediaType("image");
            setIsMediaPickerOpen(true);
          }}
        />
      </div>

      {/* ── Media Picker Modal ── */}
      <MediaPickerModal 
        isOpen={isMediaPickerOpen}
        mediaType={pickerMediaType}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(asset) => {
          if (isBroadcastLocked) {
            setIsMediaPickerOpen(false);
            return;
          }
          if (pickerPurpose === "thumbnail") {
            setStreamThumbnail(asset.file_path);
            setIsMediaPickerOpen(false);
            return;
          }

          const cw = useStudioStore.getState().sceneWidth;
          const ch = useStudioStore.getState().sceneHeight;
          
          const w = asset.width || (asset.file_type === 'video' ? 1920 : 800);
          const h = asset.height || (asset.file_type === 'video' ? 1080 : 600);
          
          const fit = asset.file_type === 'audio' 
            ? { x: 0, y: 0, width: 0, height: 0 } 
            : calculateMediaFit(w, h, cw, ch, "contain");

          addSource({
            id: crypto.randomUUID(),
            scene_id: useStudioStore.getState().sceneId || 'temp',
            type: asset.file_type,
            media_id: asset.id,
            name: asset.title || asset.filename,
            x: fit.x,
            y: fit.y,
            width: fit.width,
            height: fit.height,
            rotation: 0,
            opacity: 1,
            z_index: sources.length,
            visible: true,
            locked: false,
            config: {
              fitMode: 'contain',
              originalWidth: w,
              originalHeight: h,
              filePath: asset.file_path,
              thumbnailPath: asset.thumbnail_path,
              ...(asset.file_type === 'video' || asset.file_type === 'audio' ? { volume: 1, loop: true, muted: false } : {})
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);
          setIsMediaPickerOpen(false);
        }}
      />
    </div>
  );
}
