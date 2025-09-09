"use client";

import * as React from "react";

export type FaceCameraProps = {
  className?: string;
  /** Optional text label under the video */
  label?: string;
};

export function FaceCamera({ className, label }: FaceCameraProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    let stream: MediaStream | null = null;

    async function start() {
      try {
        setError(null);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setActive(true);
        }
      } catch (e: any) {
        setError(e?.message ?? "Camera access denied");
        setActive(false);
      }
    }

    start();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className={"relative w-full aspect-video rounded-xl overflow-hidden border border-border/60 bg-black/50 " + (className ?? "") }>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

      {/* Glass overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* HUD elements */}
      <div className="absolute top-3 left-3 text-xs text-white/80">
        <div className="flex items-center gap-2">
          <span className={"inline-block w-2 h-2 rounded-full " + (active ? "bg-emerald-400 animate-pulse" : "bg-red-400")}></span>
          <span>{active ? "Live" : "Offline"}</span>
        </div>
      </div>

      <div className="absolute inset-6 border-2 border-white/20 rounded-xl" />

      {label && (
        <div className="absolute bottom-3 left-3 text-xs text-white/80 bg-white/10 px-2 py-1 rounded-md backdrop-blur">
          {label}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-red-300 text-sm bg-red-900/40 px-4 py-2 rounded-md border border-red-400/30">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
