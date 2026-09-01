import { useState, useEffect } from "react";
import { useScenes, useCreateScene, useDeleteScene, useDuplicateScene, useRenameScene } from "../../features/studio/studio.hooks";
import { useStudioStore } from "../../stores/studio.store";
import { Clapperboard, Plus, MoreVertical, Copy, Trash2, Edit2, Check, X, AlertCircle } from "lucide-react";
import Button from "../ui/Button";

export default function SceneList() {
  const { data: scenes = [], isLoading } = useScenes();
  const createScene = useCreateScene();
  const deleteScene = useDeleteScene();
  const duplicateScene = useDuplicateScene();
  const renameScene = useRenameScene();
  
  const currentSceneId = useStudioStore((s) => s.sceneId);
  const setScene = useStudioStore((s) => s.setScene);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [blockerMessage, setBlockerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && scenes.length > 0 && !currentSceneId) {
      setScene(scenes[0], scenes[0].scene_sources || []);
    }
  }, [isLoading, scenes, currentSceneId, setScene]);

  const handleCreateScene = async () => {
    try {
      const newScene = await createScene.mutateAsync(`Scene ${scenes.length + 1}`);
      setScene(newScene, []);
    } catch (e) {
      console.error("Failed to create scene:", e);
    }
  };

  const handleSelectScene = (scene: any) => {
    if (scene.id === currentSceneId) return;
    setScene(scene, scene.scene_sources || []);
  };

  const startRenaming = (scene: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(scene.id);
    setEditName(scene.name);
  };

  const saveRename = async (sceneId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await renameScene.mutateAsync({ sceneId, name: editName.trim() });
    } catch (e) {
      console.error("Failed to rename scene:", e);
    } finally {
      setEditingId(null);
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const newScene = await duplicateScene.mutateAsync(id);
      if (newScene) {
        setScene(newScene, (newScene as any).scene_sources || []);
      }
    } catch (e) {
      console.error("Failed to duplicate scene:", e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setBlockerMessage(null);
    
    try {
      await deleteScene.mutateAsync(id);
      if (currentSceneId === id) {
        const remaining = scenes.filter(s => s.id !== id);
        if (remaining.length > 0) {
          handleSelectScene(remaining[0]);
        } else {
          handleCreateScene();
        }
      }
    } catch (e: any) {
      setBlockerMessage(e.message || "Failed to delete scene");
    }
  };

  return (
    <div className="flex flex-col h-1/2 bg-surface-1 border-b border-border w-full shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-surface-1">
        <div>
          <h3 className="font-semibold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
            <Clapperboard className="w-3.5 h-3.5 text-accent" />
            Scenes
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">Your complete broadcast layouts</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-7 h-7 p-0 text-text-secondary hover:text-text-primary"
          onClick={handleCreateScene}
          disabled={createScene.isPending}
          title="Create New Scene"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Delete Blocker Alert */}
      {blockerMessage && (
        <div className="p-2.5 m-2 bg-status-error-bg border border-status-error/30 text-status-error text-xs rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{blockerMessage}</p>
          </div>
          <button onClick={() => setBlockerMessage(null)} className="text-status-error hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scene List Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {isLoading ? (
          <div className="text-center py-6 text-text-muted text-xs">Loading scenes...</div>
        ) : scenes.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-xs space-y-2">
            <p>No scenes yet</p>
            <Button variant="secondary" size="sm" onClick={handleCreateScene}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New Scene
            </Button>
          </div>
        ) : (
          scenes.map((scene) => {
            const isSelected = currentSceneId === scene.id;
            const isEditing = editingId === scene.id;
            
            return (
              <div 
                key={scene.id}
                onClick={() => !isEditing && handleSelectScene(scene)}
                className={`
                  group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all relative text-xs
                  ${isSelected ? 'bg-accent/10 border-accent text-accent font-medium' : 'hover:bg-surface-2 text-text-secondary hover:text-text-primary border-transparent'}
                  border
                `}
              >
                <Clapperboard className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-text-muted'}`} />
                
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveRename(scene.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full bg-surface-2 border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
                      />
                      <button onClick={() => saveRename(scene.id)} className="p-0.5 hover:text-accent text-text-muted">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-0.5 hover:text-status-error text-text-muted">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="truncate select-none">{scene.name}</p>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => startRenaming(scene, e)}
                      className="p-1 hover:bg-surface-3 rounded text-text-muted hover:text-text-primary transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === scene.id ? null : scene.id); }}
                      className="p-1 hover:bg-surface-3 rounded text-text-muted hover:text-text-primary transition-colors"
                      title="More Options"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {menuOpenId === scene.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-surface-1 border border-border rounded-lg shadow-popover z-50 py-1 overflow-hidden">
                          <button 
                            className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2 transition-colors"
                            onClick={(e) => startRenaming(scene, e)}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Rename
                          </button>
                          <button 
                            className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-2 transition-colors"
                            onClick={(e) => handleDuplicate(scene.id, e)}
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplicate
                          </button>
                          <button 
                            className="w-full text-left px-3 py-1.5 text-xs text-status-error hover:bg-status-error-bg flex items-center gap-2 transition-colors"
                            onClick={(e) => handleDelete(scene.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
