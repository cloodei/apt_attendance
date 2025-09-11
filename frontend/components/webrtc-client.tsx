"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, CameraOff, CheckCircle, Users, Zap, Wifi, WifiOff } from "lucide-react";
import { useUser } from "@clerk/nextjs";

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
  /** Server URL for WebRTC connection */
  serverUrl?: string;
};

export function WebRTCClient({ 
  className, 
  label, 
  isRecognizing = false, 
  facesDetected = 0, 
  confidence = 0,
  serverUrl = "ws://10.2.89.39:8080"
}: WebRTCClientProps) {
  const { user } = useUser();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const clientIdRef = React.useRef<string>(`client_${user?.username}`);
  
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const websocketRef = React.useRef<WebSocket | null>(null);

  const startConnection = React.useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      setConnectionStatus('connecting');

      // Create WebSocket connection
      const ws = new WebSocket(`${serverUrl}/ws/${clientIdRef.current}`);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setActive(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
        setConnectionStatus('disconnected');
        setIsInitializing(false);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'answer') {
          const answer = new RTCSessionDescription({
            type: 'answer',
            sdp: message.sdp
          });
          
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(answer);
          }
        } else if (message.type === 'ice-candidate' && message.candidate) {
          try {
            const candidate = new RTCIceCandidate(message.candidate);
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.addIceCandidate(candidate);
            }
          } catch (err) {
            console.error('Error adding remote ICE candidate', err);
          }
        } else if (message.type === 'error') {
          setError(message.message ?? 'Unknown server error');
        }
      };

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = pc;
      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          // Only forward UDP candidates to the server – aiortc currently handles UDP only
          if (event.candidate.candidate && event.candidate.candidate.includes(' udp ')) {
            ws.send(JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            }));
          }
        }
      };

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          console.log('Received remote track');
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().then(() => {
            setActive(true);
            setIsInitializing(false);
          }).catch((err) => {
            console.error('Error playing video:', err);
            setError('Failed to play video stream');
            setIsInitializing(false);
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionStatus('disconnected');
          setActive(false);
        }
      };

      // Wait for WebSocket to be ready
      await new Promise((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
          resolve(true);
        }
        else {
          ws.onopen = () => resolve(true);
        }
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to server
      ws.send(JSON.stringify({
        type: 'offer',
        sdp: offer.sdp
      }));

    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err?.message ?? 'Failed to connect to server');
      setConnectionStatus('disconnected');
      setIsInitializing(false);
    }
  }, [serverUrl]);

  const stopConnection = React.useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setActive(false);
    setConnectionStatus('disconnected');
    setIsInitializing(false);
  }, []);

  React.useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  return (
    <div className={"relative w-full aspect-video rounded-2xl overflow-hidden border border-border/20 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm shadow-2xl " + (className ?? "")}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

      {/* Animated overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5" />
      </div>

      {/* Recognition overlay */}
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

      {/* HUD elements */}
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

      {/* Face detection frame */}
      <div className="absolute inset-8 border-2 border-white/30 rounded-2xl">
        <div className="absolute inset-0 border border-cyan-400/50 rounded-2xl" />
        <motion.div
          animate={isRecognizing ? { opacity: [0.3, 0.8, 0.3] } : { opacity: 0.3 }}
          transition={{ duration: 1.5, repeat: isRecognizing ? Infinity : 0 }}
          className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl"
        />
      </div>

      {/* Corner indicators */}
      <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg" />
      <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-lg" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-lg" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg" />

      {/* Control buttons */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-4">
        {!active && connectionStatus === 'disconnected' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startConnection}
            disabled={isInitializing}
            className="px-6 py-3 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">
                {isInitializing ? 'Connecting...' : 'Connect to Server'}
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
            className="px-6 py-3 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30 hover:bg-red-500/30 transition-colors"
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
            className="px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full border border-white/20"
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

      {/* Error state */}
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

      {/* Loading state */}
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

      {/* Success indicator */}
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
