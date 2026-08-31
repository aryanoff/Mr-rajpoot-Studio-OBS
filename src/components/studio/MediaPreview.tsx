import { useState, useEffect } from "react";
import { getSupabase } from "../../lib/supabase";
import { Loader2, Image as ImageIcon, Video, AlertCircle } from "lucide-react";

interface MediaPreviewProps {
  filePath?: string | null;
  fileType: string;
  thumbnailPath?: string | null;
  fitMode?: "contain" | "cover" | "crop" | "fill";
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

export default function MediaPreview({ 
  filePath, 
  fileType, 
  thumbnailPath,
  fitMode = "contain",
  autoPlay = true,
  loop = true,
  muted = true,
  className = ""
}: MediaPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadUrl() {
      if (!filePath && !thumbnailPath) {
        setLoading(false);
        setError(true);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const supabase = getSupabase();
        // For video on canvas, we prefer the actual video filePath.
        // For thumbnail grid or images, thumbnailPath or filePath is used.
        const targetPath = filePath || thumbnailPath;
        if (!targetPath) {
          if (isMounted) { setError(true); setLoading(false); }
          return;
        }

        const { data, error: signErr } = await supabase.storage
          .from("user_media")
          .createSignedUrl(targetPath, 3600);

        if (signErr || !data?.signedUrl) {
          console.error("[MediaPreview] Failed to generate signed URL:", signErr?.message);
          if (isMounted) { setError(true); setLoading(false); }
        } else if (isMounted) {
          setUrl(data.signedUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("[MediaPreview] Unexpected error loading media:", err);
        if (isMounted) { setError(true); setLoading(false); }
      }
    }

    loadUrl();
    return () => { isMounted = false; };
  }, [filePath, thumbnailPath]);

  const objectFitClass = fitMode === "cover" || fitMode === "crop" 
    ? "object-cover" 
    : fitMode === "fill" 
      ? "object-fill" 
      : "object-contain";

  if (error || (!filePath && !thumbnailPath)) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-surface-2 text-text-muted p-2 text-center ${className}`}>
        {fileType === "video" ? <Video size={24} className="opacity-40 mb-1" /> : <ImageIcon size={24} className="opacity-40 mb-1" />}
        <span className="text-[10px] text-status-error flex items-center gap-1">
          <AlertCircle size={10} /> Media unavailable
        </span>
      </div>
    );
  }

  if (loading || !url) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-surface-2/60 backdrop-blur-xs ${className}`}>
        <Loader2 size={18} className="text-accent animate-spin" />
      </div>
    );
  }

  if (fileType === "video") {
    return (
      <video 
        src={url} 
        autoPlay={autoPlay} 
        loop={loop} 
        muted={muted} 
        playsInline 
        className={`absolute inset-0 w-full h-full pointer-events-none ${objectFitClass} ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  if (fileType === "image") {
    return (
      <img 
        src={url} 
        alt="Scene Layer" 
        className={`absolute inset-0 w-full h-full pointer-events-none ${objectFitClass} ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-surface-2 ${className}`}>
      {fileType === "audio" ? (
        <span className="text-xs text-text-muted font-medium">Audio Layer</span>
      ) : (
        <ImageIcon size={28} className="text-text-muted opacity-40" />
      )}
    </div>
  );
}
