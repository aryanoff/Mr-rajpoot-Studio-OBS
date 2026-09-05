import { create } from 'zustand';
import type { Database } from '../types/supabase';

import type { AspectRatio } from '../features/studio/studio.constants';
import { RATIO_PRESETS } from '../features/studio/studio.constants';

type SceneSource = Database['public']['Tables']['scene_sources']['Row'];

export interface StudioState {
  // Current active scene state
  sceneId: string | null;
  sceneName: string;
  sceneRatio: AspectRatio;
  sceneWidth: number;
  sceneHeight: number;
  sceneFps: number;
  sceneBg: string;
  sceneVersion: number;
  sources: SceneSource[];
  selectedSourceId: string | null;
  
  // Stream metadata (separate from scene/media metadata)
  streamTitle: string;
  streamDescription: string;
  streamThumbnail: string | null;
  
  // Canvas View State
  editorMode: 'editor' | 'preview';
  zoom: number | 'auto';
  pan: { x: number; y: number };
  showSafeArea: boolean;

  // Panel collapse states
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  isBottomPanelCollapsed: boolean;

  // History for Undo/Redo
  history: { sources: SceneSource[] }[];
  historyIndex: number;

  // Actions
  setScene: (scene: any, sources: SceneSource[]) => void;
  setSceneName: (name: string) => void;
  setSceneRatio: (ratio: AspectRatio) => void;
  updateSceneConfig: (updates: Partial<StudioState>) => void;
  setStreamTitle: (title: string) => void;
  setStreamDescription: (desc: string) => void;
  setStreamThumbnail: (thumb: string | null) => void;
  
  addSource: (source: SceneSource) => void;
  updateSource: (id: string, updates: Partial<SceneSource>) => void;
  removeSource: (id: string) => void;
  moveLayer: (id: string, action: 'forward' | 'backward' | 'front' | 'back') => void;
  setSelectedSource: (id: string | null) => void;
  
  undo: () => void;
  redo: () => void;
  
  setEditorMode: (mode: 'editor' | 'preview') => void;
  setZoom: (zoom: number | 'auto') => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setShowSafeArea: (show: boolean) => void;
  
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  reset: () => void;
  
  // Studio Loading & Lifecycle State
  studioLoadingState: 'INITIALIZING' | 'LOADING_SCENE' | 'EMPTY' | 'READY' | 'ERROR';
  setStudioLoadingState: (loadingState: 'INITIALIZING' | 'LOADING_SCENE' | 'EMPTY' | 'READY' | 'ERROR') => void;

  // Broadcast Lock Mode (Freezes mutations during active streams)
  isBroadcastLocked: boolean;
  setIsBroadcastLocked: (locked: boolean) => void;

  // Save status
  saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error') => void;
}

const pushHistory = (state: StudioState, newSources: SceneSource[]) => {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ sources: newSources });
  
  // Keep last 50 states
  if (newHistory.length > 50) {
    newHistory.shift();
  }
  
  return {
    sources: newSources,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    saveStatus: 'unsaved' as const
  };
};

export const useStudioStore = create<StudioState>((set) => ({
  sceneId: null,
  sceneName: 'Untitled Scene',
  sceneRatio: '16:9',
  sceneWidth: 1920,
  sceneHeight: 1080,
  sceneFps: 30,
  sceneBg: '#000000',
  sceneVersion: 1,
  sources: [],
  selectedSourceId: null,
  
  streamTitle: '',
  streamDescription: '',
  streamThumbnail: null,
  
  editorMode: 'editor',
  zoom: 'auto',
  pan: { x: 0, y: 0 },
  showSafeArea: false,

  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  isBottomPanelCollapsed: false,

  history: [{ sources: [] }],
  historyIndex: 0,
  
  saveStatus: 'idle',
  
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  studioLoadingState: 'LOADING_SCENE',
  setStudioLoadingState: (studioLoadingState) =>
    set((state) =>
      state.studioLoadingState === studioLoadingState
        ? state
        : { studioLoadingState }
    ),

  isBroadcastLocked: false,
  setIsBroadcastLocked: (isBroadcastLocked) =>
    set((state) =>
      state.isBroadcastLocked === isBroadcastLocked
        ? state
        : { isBroadcastLocked }
    ),
  
  setScene: (scene, sources) => {
    // Derive ratio from width/height if possible
    let ratio: AspectRatio = '16:9';
    const aspect = scene.width / scene.height;
    if (Math.abs(aspect - 9/16) < 0.05) ratio = '9:16';
    else if (Math.abs(aspect - 4/3) < 0.05) ratio = '4:3';
    else if (Math.abs(aspect - 1) < 0.05) ratio = '1:1';
    else if (Math.abs(aspect - 21/9) < 0.05) ratio = '21:9';

    const derivedState = sources && sources.length > 0 ? 'READY' : 'EMPTY';

    set((state) => ({
      sceneId: scene.id,
      sceneName: scene.name,
      sceneRatio: ratio,
      sceneWidth: scene.width,
      sceneHeight: scene.height,
      sceneFps: scene.fps,
      sceneBg: scene.background || '#000000',
      sceneVersion: scene.version || 1,
      sources,
      studioLoadingState: derivedState,
      // If streamTitle is empty, pre-fill from scene name
      streamTitle: state.streamTitle || scene.name,
      history: [{ sources }],
      historyIndex: 0,
      selectedSourceId: null,
      saveStatus: 'idle'
    }));
  },

  setSceneName: (name) => set({ sceneName: name, saveStatus: 'unsaved' }),
  
  setSceneRatio: (ratio: AspectRatio) => set((state) => {
    const preset = RATIO_PRESETS.find(p => p.id === ratio);
    if (!preset) return state;
    
    return {
      sceneRatio: ratio,
      sceneWidth: preset.defaultWidth,
      sceneHeight: preset.defaultHeight,
      saveStatus: 'unsaved'
    };
  }),
  
  updateSceneConfig: (updates) => set((state) => ({ ...state, ...updates, saveStatus: 'unsaved' })),
  
  setStreamTitle: (streamTitle) => set({ streamTitle }),
  setStreamDescription: (streamDescription) => set({ streamDescription }),
  setStreamThumbnail: (streamThumbnail) => set({ streamThumbnail }),

  setSelectedSource: (id) => set({ selectedSourceId: id }),
  
  addSource: (source) => set((state) => {
    const newSources = [...state.sources, source];
    const historyUpdate = pushHistory(state, newSources);
    return {
      ...historyUpdate,
      studioLoadingState: 'READY'
    };
  }),
  
  updateSource: (id, updates) => set((state) => {
    const newSources = state.sources.map(s => s.id === id ? { ...s, ...updates } : s);
    return pushHistory(state, newSources);
  }),
  
  removeSource: (id) => set((state) => {
    const newSources = state.sources.filter(s => s.id !== id);
    const updates = pushHistory(state, newSources);
    return {
      ...updates,
      studioLoadingState: newSources.length > 0 ? 'READY' : 'EMPTY',
      selectedSourceId: state.selectedSourceId === id ? null : state.selectedSourceId
    };
  }),
  
  moveLayer: (id: string, action: 'forward' | 'backward' | 'front' | 'back') => set((state) => {
    const sorted = [...state.sources].sort((a, b) => a.z_index - b.z_index);
    const index = sorted.findIndex(s => s.id === id);
    if (index === -1) return state;

    if (action === 'forward' && index < sorted.length - 1) {
      // Swap with next
      const temp = sorted[index].z_index;
      sorted[index].z_index = sorted[index + 1].z_index;
      sorted[index + 1].z_index = temp;
    } else if (action === 'backward' && index > 0) {
      // Swap with prev
      const temp = sorted[index].z_index;
      sorted[index].z_index = sorted[index - 1].z_index;
      sorted[index - 1].z_index = temp;
    } else if (action === 'front') {
      sorted[index].z_index = sorted[sorted.length - 1].z_index + 1;
    } else if (action === 'back') {
      sorted[index].z_index = sorted[0].z_index - 1;
    }
    
    // Normalize z_indexes
    const normalized = sorted.sort((a, b) => a.z_index - b.z_index).map((s, i) => ({ ...s, z_index: i }));
    return pushHistory(state, normalized);
  }),
  
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        sources: state.history[newIndex].sources,
        selectedSourceId: null,
        saveStatus: 'unsaved'
      };
    }
    return state;
  }),
  
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        sources: state.history[newIndex].sources,
        selectedSourceId: null,
        saveStatus: 'unsaved'
      };
    }
    return state;
  }),

  setEditorMode: (editorMode) => set({ editorMode }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (panUpdate) => set((state) => ({
    pan: typeof panUpdate === 'function' ? panUpdate(state.pan) : panUpdate
  })),
  setShowSafeArea: (showSafeArea) => set({ showSafeArea }),

  toggleLeftPanel: () => set((state) => ({ isLeftPanelCollapsed: !state.isLeftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ isRightPanelCollapsed: !state.isRightPanelCollapsed })),
  toggleBottomPanel: () => set((state) => ({ isBottomPanelCollapsed: !state.isBottomPanelCollapsed })),

  reset: () => set({
    sceneId: null,
    sceneName: "Untitled Scene",
    sceneRatio: "16:9",
    sceneWidth: 1920,
    sceneHeight: 1080,
    sceneFps: 30,
    sceneBg: "#000000",
    sceneVersion: 1,
    sources: [],
    selectedSourceId: null,
    streamTitle: "Live Broadcast",
    streamDescription: "",
    streamThumbnail: null,
    editorMode: 'editor',
    zoom: 'auto',
    pan: { x: 0, y: 0 },
    showSafeArea: false,
    history: [{ sources: [] }],
    historyIndex: 0,
    saveStatus: 'idle',
    studioLoadingState: 'LOADING_SCENE',
    isBroadcastLocked: false,
  }),
}));
