"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, CameraOff, CheckCircle, Users, Zap, Wifi, WifiOff } from "lucide-react";
import { API_BASE } from "@/lib/utils";

export type WebRTCClientProps = {
  className?: string;
  /** Optional text label under the video */
  label?: string;
  /** Show recognition status */
  isRecognizing?: boolean;
  /** Number of faces detected */
  facesDetected?: number;
  /** Recognition confidence */
  confidence?: number;
  /** Optional roster to inform backend of valid student ids to match: array of {id, name} */
  students?: Array<{ id: number; name: string }>;
  /** Session id for this live run (for attendance writing) */
  sessionId?: number;
  /** End time (ISO) when the run should auto-stop on both client and server */
  endTimeISO?: string;
};

export function WebRTCClient({ 
  className, 
  label, 
  isRecognizing = false, 
  facesDetected = 0, 
  confidence = 0, 
  students, 
  sessionId, 
  endTimeISO 
}: WebRTCClientProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  if (!g.__webrtc_singleton) {
    g.__webrtc_singleton = {
      pc: null as RTCPeerConnection | null,
      stream: null as MediaStream | null
    };
  }
  const singleton = g.__webrtc_singleton as {
    pc: RTCPeerConnection | null;
    stream: MediaStream | null
  };

  React.useEffect(() => {
    if (videoRef.current && singleton.stream) {
      try {
        videoRef.current.srcObject = singleton.stream;
      }
      catch {}
    }
  }, []);

  async function startConnection() {
    setIsInitializing(true);
    setConnectionStatus('connecting');

    const pc = singleton.pc ?? new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    singleton.pc = pc;

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : null;
      if (stream) {
        singleton.stream = stream;
        if (videoRef.current) {
          try { videoRef.current.srcObject = stream; } catch {}
        }
      }
    };

    const offer = await pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: false,
    });
    await pc.setLocalDescription(offer);

    try {
      const response = await fetch(`${API_BASE}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          students_list: students ? Object.fromEntries(students.map(s => [String(s.id), s.name])) : undefined,
          session_id: sessionId,
          end_time: endTimeISO,
        }),
      });

      if (!response.ok)
        throw new Error('Failed to get answer from server.');

      const answer = await response.json();

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      setActive(true);
      setIsInitializing(false);
      setConnectionStatus('connected');
    }
    catch (error: any) {
      console.error('Error starting stream:', error);
      setError(error?.message || error || 'An error occurred while starting the stream.');
      stopConnection();
    }
  };

  const stopConnection = () => {
    stopWebRTCConnection();
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch {}
    }
    setActive(false);
    setIsInitializing(false);
    setConnectionStatus('disconnected');
  };

  React.useEffect(() => {
    if (!endTimeISO)
      return;

    let timer: any;
    try {
      const end = new Date(endTimeISO).getTime();
      const now = Date.now();
      const delay = Math.max(0, end - now);

      timer = setTimeout(() => {
        stopConnection();
      }, delay);
    }
    catch {}

    return () => {
      if (timer)
        clearTimeout(timer);
    };
  }, [endTimeISO]);

  return (
    <div className={"relative w-full h-full aspect-video rounded-2xl overflow-hidden border border-border/20 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm shadow-2xl " + (className ?? "")}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5" />
      </div>

      <AnimatePresence>
        {isRecognizing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"
          />
        )}
      </AnimatePresence>

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/20">
            <motion.div
              animate={{ scale: active ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 2, repeat: active ? Infinity : 0 }}
              className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`}
            />
            <span className="text-xs text-white/90 font-medium">
              {active ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/20">
            {connectionStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : connectionStatus === 'connecting' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border border-cyan-400/50 border-t-cyan-400 rounded-full"
              />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
            <span className="text-xs text-white/90 font-medium">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>

          {facesDetected > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30"
            >
              <Users className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-300 font-medium">
                {facesDetected} face{facesDetected !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </motion.div>

        {confidence > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30"
          >
            <Zap className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </motion.div>
        )}
      </div>

      <div className="absolute inset-8 border-2 border-white/30 rounded-2xl">
        <div className="absolute inset-0 border border-cyan-400/50 rounded-2xl" />
        <motion.div
          animate={isRecognizing ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.3 }}
          transition={{ duration: 1.5, repeat: isRecognizing ? Infinity : 0 }}
          className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl"
        />
      </div>

      <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg" />
      <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-lg" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-lg" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg" />

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-4">
        {!active && connectionStatus === 'disconnected' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startConnection}
            disabled={isInitializing}
            className="lg:px-6 lg:py-3 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">
                {isInitializing ? 'Initializing...' : 'Connect to Server'}
              </span>
            </div>
          </motion.button>
        )}

        {active && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stopConnection}
            className="lg:px-6 lg:py-3 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30 hover:bg-red-500/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CameraOff className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300 font-medium">Disconnect</span>
            </div>
          </motion.button>
        )}

        {label && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:px-4 lg:py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20"
          >
            <div className="flex items-center gap-2">
              {isRecognizing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </motion.div>
                  <span className="text-sm text-white/90 font-medium">{label}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-white/70" />
                  <span className="text-sm text-white/90 font-medium">{label}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center p-6 bg-red-900/60 backdrop-blur-sm rounded-2xl border border-red-400/30 max-w-sm mx-4">
              <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-300 mb-2">Connection Error</h3>
              <p className="text-sm text-red-200 mb-4">{error}</p>
              <p className="text-xs text-red-300/80">
                Please check your connection and try again.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInitializing && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full mx-auto mb-4"
              />
              <p className="text-white/90 font-medium">Connecting to server...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {facesDetected > 0 && confidence > 0.8 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 2 }}
              className="w-16 h-16 bg-emerald-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-emerald-400/50"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function stopWebRTCConnection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any;
  const singleton = g.__webrtc_singleton as { pc: RTCPeerConnection | null; stream: MediaStream | null } | undefined;
  if (!singleton) return;
  try { if (singleton.pc) singleton.pc.close(); } catch {}
  singleton.pc = null;
  singleton.stream = null;
}
