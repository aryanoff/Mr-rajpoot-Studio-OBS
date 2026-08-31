import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";

import { useSchedules, useCreateSchedule, useDeleteSchedule, usePlaylists, useStreams } from "../../features/streams/streams.hooks";

type ViewMode = "month" | "week" | "list";

const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Schedules() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: schedules = [] } = useSchedules();
  const { data: playlists = [] } = usePlaylists();
  const { data: streams = [] } = useStreams();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    stream_id: "",
    playlist_id: "",
    start_time: "",
    recurrence_type: "one_time"
  });
  const [error, setError] = useState("");

  const handleCreateSchedule = async () => {
    setError("");
    if (!newSchedule.name || !newSchedule.start_time || (!newSchedule.stream_id && !newSchedule.playlist_id)) {
      setError("Please fill all required fields");
      return;
    }

    const selectedDate = new Date(newSchedule.start_time);
    if (selectedDate <= new Date()) {
      setError("Cannot schedule in the past");
      return;
    }

    try {
      // If a stream_id isn't provided but playlist_id is, we would technically need to create a stream first. 
      // Assuming for now the user must select an existing stream.
      if (!newSchedule.stream_id) {
        setError("Please select a stream");
        return;
      }
      
      await createSchedule.mutateAsync({
        name: newSchedule.name,
        stream_id: newSchedule.stream_id,
        playlist_id: newSchedule.playlist_id || undefined,
        start_time: selectedDate.toISOString(),
        recurrence_type: newSchedule.recurrence_type,
        status: "draft",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      setIsModalOpen(false);
      setNewSchedule({ name: "", stream_id: "", playlist_id: "", start_time: "", recurrence_type: "one_time" });
    } catch (e: any) {
      setError(e.message);
    }
  };
  
  const scheduleEvents = schedules.map((s: any) => {
    const d = new Date(s.start_time);
    return {
      id: s.id,
      title: s.name || s.playlists?.name || `Schedule for ${s.stream_destinations?.platform || 'Unknown'}`,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      day: d.getDate(),
      color: "bg-accent/20 border-accent/30 text-accent-light"
    };
  });

  return (
    <div className="space-y-6 relative">
      <PageHeader 
        title="Schedules"
        description="Manage your automated streaming schedules"
        action={
          <Button variant="accent" size="md" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            Create Schedule
          </Button>
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-1 border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">New Schedule</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary"><X size={20}/></button>
            </div>
            
            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm">{error}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Schedule Name</label>
                <input 
                  type="text" 
                  value={newSchedule.name} 
                  onChange={e => setNewSchedule(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:border-accent outline-none" 
                  placeholder="e.g. Weekly Podcast"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Target Stream</label>
                <select 
                  value={newSchedule.stream_id} 
                  onChange={e => setNewSchedule(prev => ({...prev, stream_id: e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
                >
                  <option value="">Select a Stream</option>
                  {streams.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Playlist (Optional)</label>
                <select 
                  value={newSchedule.playlist_id} 
                  onChange={e => setNewSchedule(prev => ({...prev, playlist_id: e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:border-accent outline-none"
                >
                  <option value="">None / Use Stream Default</option>
                  {playlists.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
                <input 
                  type="datetime-local" 
                  value={newSchedule.start_time} 
                  onChange={e => setNewSchedule(prev => ({...prev, start_time: e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:border-accent outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Recurrence Type</label>
                <select 
                  value={newSchedule.recurrence_type} 
                  onChange={e => setNewSchedule(prev => ({...prev, recurrence_type: e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:border-accent outline-none" 
                >
                  <option value="one_time">One Time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateSchedule} disabled={createSchedule.isPending}>
                {createSchedule.isPending ? "Saving..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle + Month nav */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary min-w-[160px] text-center">
            {currentDate.toLocaleDateString("default", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex bg-surface-2 rounded-xl p-1 border border-border">
          {(["month", "week", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                viewMode === mode
                  ? "bg-accent text-white shadow-glow"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode !== "list" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card variant="glass" padding="none">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {/* Empty cells for offset (Aug 2026 starts on Saturday) */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-surface/30" />
              ))}
              {daysInMonth.map((day) => {
                const events = scheduleEvents.filter((e: any) => e.day === day);
                const isToday = day === 23;

                return (
                  <div
                    key={day}
                    className={`min-h-[100px] border-b border-r border-border p-1.5 hover:bg-surface-2/30 transition-colors ${
                      isToday ? "bg-accent/5" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1 ${
                        isToday
                          ? "bg-accent text-white"
                          : "text-text-secondary"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-1">
                      {events.map((event: any) => (
                        <div
                          key={event.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate cursor-pointer ${event.color} flex justify-between items-center`}
                        >
                          <span className="truncate">{event.title}</span>
                          <Trash2 size={10} className="hover:text-red-400 shrink-0 ml-1" onClick={(e) => { e.stopPropagation(); deleteSchedule.mutate(event.id); }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      ) : (
        /* List View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card variant="glass" padding="none">
            {scheduleEvents.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center text-text-muted mb-4">
                  <Clock size={28} className="text-accent" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-1">No scheduled broadcasts</h3>
                <p className="text-sm text-text-secondary max-w-sm mb-5">
                  Plan your future YouTube live streams and let the cloud streaming engine start them automatically at the exact scheduled time.
                </p>
                <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                  <Plus size={16} className="mr-1.5" />
                  Schedule First Broadcast
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {scheduleEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 hover:bg-surface-2/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
                        <CalendarIcon size={18} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {event.title}
                        </p>
                        <p className="text-xs text-text-muted flex items-center gap-1">
                          <Clock size={12} />
                          Aug {event.day} • {event.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="scheduled" size="sm">
                        Scheduled
                      </Badge>
                      <button className="text-text-muted hover:text-red-400" onClick={() => deleteSchedule.mutate(event.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
