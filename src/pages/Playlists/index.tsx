import { useState } from "react";
import { Plus, ListMusic, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { usePlaylists, useCreatePlaylist, useDeletePlaylist, useAddPlaylistItem, useRemovePlaylistItem } from "../../features/streams/streams.hooks";
import MediaPickerModal from "../../components/studio/MediaPickerModal";

export default function Playlists() {
  const { data: playlists = [], isLoading } = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const addPlaylistItem = useAddPlaylistItem();
  const removePlaylistItem = useRemovePlaylistItem();

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist.mutateAsync({ name: newPlaylistName });
    setNewPlaylistName("");
    setIsCreating(false);
  };

  const handleAddMedia = async (asset: any) => {
    if (!activePlaylistId) return;
    const playlist = playlists.find((p: any) => p.id === activePlaylistId);
    if (!playlist) return;
    
    await addPlaylistItem.mutateAsync({
      playlist_id: activePlaylistId,
      media_id: asset.id,
      position: (playlist.playlist_items?.length || 0) + 1
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Playlists"
        description="Organize your media into looping sequences"
        action={
          <Button variant="accent" size="md" onClick={() => setIsCreating(true)}>
            <Plus size={16} />
            Create Playlist
          </Button>
        }
      />

      {isCreating && (
        <Card variant="default">
          <h3 className="text-sm font-medium mb-3">Create Playlist</h3>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              placeholder="Playlist Name" 
              className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
            <Button variant="primary" onClick={handleCreate} disabled={createPlaylist.isPending}>
              {createPlaylist.isPending ? "Creating..." : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card variant="glass" padding="none">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading playlists...</div>
        ) : playlists.length === 0 ? (
          <div className="p-12 text-center border-border flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center text-text-muted mb-4">
              <ListMusic size={28} className="text-accent" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">No playlists yet</h3>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Build a sequence of videos and let your cloud engine broadcast them automatically in 24/7 continuous loops.
            </p>
            <Button variant="primary" size="md" onClick={() => setIsCreating(true)}>
              <Plus size={16} className="mr-1.5" />
              Create First Playlist
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {playlists.map((playlist: any) => (
              <div key={playlist.id} className="p-4 hover:bg-surface-2/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">{playlist.name}</h3>
                    <p className="text-sm text-text-muted">
                      {playlist.playlist_items?.length || 0} items • {playlist.playback_mode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setActivePlaylistId(playlist.id)}>
                      <Plus size={14} className="mr-1" /> Add Media
                    </Button>
                    <button className="p-2 rounded-lg hover:bg-surface-2 text-red-400 hover:text-red-300 transition-colors" onClick={() => {
                        if (confirm('Are you sure you want to delete this playlist?')) {
                          deletePlaylist.mutate(playlist.id);
                        }
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Playlist Items */}
                {playlist.playlist_items && playlist.playlist_items.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-surface-3 space-y-2">
                    {playlist.playlist_items.sort((a: any, b: any) => a.position - b.position).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-surface-2 p-2 rounded-md text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-text-muted font-mono text-xs">{item.position}</span>
                          <span className={item.enabled ? 'text-text-primary' : 'text-text-muted line-through'}>
                            {item.media_assets?.filename || 'Unknown Media'}
                          </span>
                        </div>
                        <button className="text-text-muted hover:text-red-400 p-1" onClick={() => removePlaylistItem.mutate(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <MediaPickerModal 
        isOpen={!!activePlaylistId} 
        onClose={() => setActivePlaylistId(null)} 
        onSelect={handleAddMedia} 
      />
    </div>
  );
}
