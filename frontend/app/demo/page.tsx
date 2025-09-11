"use client";

import * as React from "react";
import { FaceCamera } from "../../components/face-camera";
import { WebRTCClient } from "../../components/webrtc-client";
import { motion } from "motion/react";
import { Camera, Wifi, Users, Zap } from "lucide-react";

export default function DemoPage() {
  const [isRecognizing, setIsRecognizing] = React.useState(false);
  const [facesDetected, setFacesDetected] = React.useState(0);
  const [confidence, setConfidence] = React.useState(0);

  // Simulate face recognition for demo purposes
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsRecognizing(true);
        setFacesDetected(Math.floor(Math.random() * 3) + 1);
        setConfidence(Math.random() * 0.4 + 0.6); // 60-100% confidence
        
        setTimeout(() => {
          setIsRecognizing(false);
        }, 2000);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            APT Attendance Camera Demo
          </h1>
          <p className="text-xl text-white/70 mb-8">
            Real-time camera feed comparison: Local vs Server
          </p>
          
          {/* Status indicators */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">Local Camera</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30">
              <Wifi className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">Server Stream</span>
            </div>
            {facesDetected > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 backdrop-blur-sm rounded-full border border-cyan-400/30">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300 font-medium">
                  {facesDetected} face{facesDetected !== 1 ? 's' : ''} detected
                </span>
              </div>
            )}
            {confidence > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 backdrop-blur-sm rounded-full border border-purple-400/30">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300 font-medium">
                  {Math.round(confidence * 100)}% confidence
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Camera comparison grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Local Camera */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-2">Local Camera</h2>
              <p className="text-white/60">Direct camera access from browser</p>
            </div>
            <FaceCamera
              label="Local Feed"
              isRecognizing={isRecognizing}
              facesDetected={facesDetected}
              confidence={confidence}
              className="w-full"
            />
          </motion.div>

          {/* WebRTC Server Stream */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-2">Server Stream</h2>
              <p className="text-white/60">Camera feed from server via WebRTC</p>
            </div>
            <WebRTCClient
              label="Server Feed"
              isRecognizing={isRecognizing}
              facesDetected={facesDetected}
              confidence={confidence}
              serverUrl="ws://localhost:8000"
              className="w-full"
            />
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-4">How to Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="text-lg font-medium text-emerald-300 mb-2">Local Camera</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Automatically starts when page loads</li>
                  <li>• Requires camera permissions</li>
                  <li>• Shows direct browser camera feed</li>
                  <li>• Simulated face recognition overlay</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-medium text-blue-300 mb-2">Server Stream</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Click "Connect to Server" to start</li>
                  <li>• Requires backend server running</li>
                  <li>• Shows server camera feed via WebRTC</li>
                  <li>• Real-time video streaming</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 p-4 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
              <p className="text-sm text-yellow-200">
                <strong>Note:</strong> Make sure the backend server is running on port 8000 
                and has access to a camera for the server stream to work.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
