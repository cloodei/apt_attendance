"use client";

import { CustomSignIn } from "@/components/custom-signin";
import { motion } from "motion/react";
import { GraduationCap, Camera, Shield, Zap } from "lucide-react";

export default function Page() {

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-4 py-8">
        {/* Left Side - Features */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-3xl border border-border/20 bg-card/30 backdrop-blur-xl p-8 h-[600px] flex flex-col justify-between overflow-hidden shadow-2xl">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-cyan-400 to-foreground bg-clip-text text-transparent">
                  Smart Attendance
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                  AI-powered face recognition • Real-time tracking • Zero friction
                </p>
              </motion.div>

              <div className="space-y-4">
                {[
                  { icon: Camera, title: "Real-time Recognition", desc: "Instant face detection and verification" },
                  { icon: Shield, title: "Secure & Private", desc: "Advanced encryption and data protection" },
                  { icon: Zap, title: "Lightning Fast", desc: "Sub-second response times" }
                ].map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/20 backdrop-blur-sm border border-border/20"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="relative mx-auto"
            >
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-cyan-400/30">
                <GraduationCap className="w-16 h-16 text-cyan-400" />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/10 to-blue-500/10 animate-pulse" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground/80">
                Powered by advanced AI technology
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Sign In Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center items-center"
        >
          <CustomSignIn />
        </motion.div>
      </div>
    </div>
  );
}
