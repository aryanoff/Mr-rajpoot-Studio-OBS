import Dialog from "./Dialog";
import Button from "./Button";
import { Youtube, UploadCloud, Film, Play } from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { useNavigate } from "react-router-dom";
import { useStreamDestinations, useMediaAssets, usePlaylists, useSchedules } from "../../features/streams/streams.hooks";



export default function OnboardingModal() {
  const { dismissedOnboarding, setDismissedOnboarding } = useUIStore();
  const navigate = useNavigate();
  
  // Real backend queries
  const { data: destinations } = useStreamDestinations();
  const { data: media } = useMediaAssets();
  const { data: playlists } = usePlaylists();
  const { data: schedules } = useSchedules();

  // Progress calculation
  const hasDest = destinations && destinations.length > 0;
  const hasMedia = media && media.length > 0;
  const hasPlaylist = playlists && playlists.length > 0;
  const hasSchedule = schedules && schedules.length > 0;

  const totalSteps = 4;
  const completedSteps = [hasDest, hasMedia, hasPlaylist, hasSchedule].filter(Boolean).length;
  const isComplete = completedSteps === totalSteps;

  // If fully complete OR user dismissed it this session, don't show it.
  if (isComplete || dismissedOnboarding) return null;

  // Determine current focus step dynamically based on what's missing
  let stepIndex = 0;
  if (hasDest) stepIndex = 1;
  if (hasDest && hasMedia) stepIndex = 2;
  if (hasDest && hasMedia && hasPlaylist) stepIndex = 3;

  // We reuse the visual steps array to map to the current missing state
  const stepMappings = [
    {
      title: "Connect Destination",
      description: "Link your YouTube account or enter a Stream Key to authorize broadcasting.",
      icon: Youtube,
      actionLabel: "Go to Settings",
      route: "/settings",
    },
    {
      title: "Upload Media",
      description: "Upload a video or audio file to your cloud storage.",
      icon: UploadCloud,
      actionLabel: "Go to Media",
      route: "/media",
    },
    {
      title: "Create Playlist",
      description: "Group your media into a continuous playlist for 24/7 streaming.",
      icon: Film,
      actionLabel: "Go to Playlists",
      route: "/playlists",
    },
    {
      title: "Schedule Stream",
      description: "Schedule your playlist to broadcast automatically.",
      icon: Play,
      actionLabel: "Go to Schedules",
      route: "/schedules",
    },
  ];

  const currentStepData = stepMappings[stepIndex];

  const handleAction = () => {
    setDismissedOnboarding(true);
    navigate(currentStepData.route);
  };

  const handleSkip = () => {
    setDismissedOnboarding(true);
  };

  return (
    <Dialog
      isOpen={!isComplete && !dismissedOnboarding}
      onClose={handleSkip}
      title="Setup Wizard"
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button variant="accent" onClick={handleAction}>
            {currentStepData.actionLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6">
          <currentStepData.icon size={32} />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">{currentStepData.title}</h3>
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          {currentStepData.description}
        </p>
        
        <div className="w-full max-w-xs mb-6">
          <div className="flex justify-between text-xs text-text-muted mb-2">
            <span>Setup Progress</span>
            <span>{Math.round((completedSteps / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden">
            <div className="bg-accent h-full transition-all duration-500" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {stepMappings.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 bg-accent"
                  : i < stepIndex
                  ? "w-2 bg-status-success"
                  : "w-2 bg-surface-3"
              }`}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}
