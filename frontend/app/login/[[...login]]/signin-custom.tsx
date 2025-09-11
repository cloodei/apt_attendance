"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Camera, Zap } from "lucide-react";
import { CustomSignIn } from "./custom-signin";

export function SignInCustom() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative hidden lg:block"
      >
        <div className="relative rounded-3xl border border-border/70 bg-card/45 backdrop-blur-xl p-8 h-[480px] flex flex-col justify-between overflow-hidden shadow-[0_6px_32px_4px_rgba(0,0,0,0.07)]">
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-primary/80 to-foreground bg-clip-text text-transparent">
                Smart Attendance
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                AI-powered face recognition • Real-time tracking • Zero friction
              </p>
            </motion.div>

            <div className="space-y-4">
              {[
                { icon: Camera, title: "Real-time Recognition", desc: "Instant face detection and verification" },
                { icon: Zap, title: "Lightning Fast", desc: "Sub-second response times" }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-background/20 backdrop-blur-sm border border-border/80"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-foreground rounded-xl flex items-center justify-center">
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
            className="relative mx-auto mt-4"
          >
            <Image src="/Clang01.png" alt="Logo" width={100} height={100} />
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

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex justify-center items-center"
      >
        <CustomSignIn />
      </motion.div>
    </>
  )
}
