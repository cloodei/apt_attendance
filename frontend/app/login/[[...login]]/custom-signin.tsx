"use client";

import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { API_BASE } from "@/lib/utils";
import { useSetUser } from "@/stores/user_store";
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  GraduationCap, 
  AlertCircle, 
  Clock,
  Users,
  BarChart3,
  Shield
} from "lucide-react";
import { redirect } from "next/navigation";

type FormData = {
  account_id: string;
  password: string;
};

export function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const setUser = useSetUser();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (!isLoaded)
      return;

    try {
      let dbUser;

      try {
        const up = data.account_id.toUpperCase();
        const res = await fetch(`${API_BASE}/api/users/${up}`);
        if (res.ok) {
          dbUser = await res.json();
        }
      }
      catch (e) {
        console.warn("Failed to fetch DB user post-signin", e);
      }

      const result = await signIn.create({
        identifier: data.account_id,
        password: data.password,
      });
      setUser(dbUser);
      await setActive({ session: result.createdSessionId });

      if (result.status !== "complete") {
        setError("root", {
          message: "Sign in failed. Please try again.",
          type: "manual",
        });
      }
    }
    catch (err: any) {
      console.error("Sign in error:", err);
      setError("root", {
        message: err.errors?.[0]?.message || "An error occurred during sign in",
        type: "manual",
      });
    }
  };

  if (!isLoaded)
    return (
      <div className="relative flex w-full items-center justify-center overflow-hidden p-4">
        <div className="z-10 w-full max-w-6xl">
          <div className="bg-secondary/50 overflow-hidden rounded-[40px] shadow-2xl">
            <div className="grid min-h-[600px] lg:grid-cols-2">
              <div className="brand-side relative m-4 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-xl opacity-80">Loading your attendance portal...</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center p-12">
                <div className="mx-auto w-full max-w-md text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Please wait...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )

  return (
    <div className="relative flex w-full items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-6xl"
      >
        <div className="bg-zinc-400/5 overflow-hidden rounded-[40px] shadow-[0px_4px_32px_rgb(0,0,0,0.24)]">
          <div className="grid min-h-[600px] lg:grid-cols-2">
            <div className="brand-side relative m-4 rounded-3xl  bg-[url('https://cdn.midjourney.com/299f94f9-ecb9-4b26-bead-010b8d8b01d9/0_0.webp?w=800&q=80')] bg-cover p-12 text-white">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mb-12 text-lg font-semibold uppercase tracking-tight"
                >
                  Attendance Portal
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mb-4 text-6xl font-semibold tracking-tighter"
                >
                  Track, Manage, Succeed
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="mb-12 text-xl opacity-80"
                >
                  Your comprehensive attendance management system for seamless tracking and reporting
                </motion.p>

                <div className="space-y-6">
                  {[
                    {
                      icon: <Clock size={16} />,
                      title: 'Real-time Tracking',
                      desc: 'Monitor attendance instantly with live updates',
                    },
                    {
                      icon: <Users size={16} />,
                      title: 'Team Management',
                      desc: 'Manage multiple teams and departments efficiently',
                    },
                    {
                      icon: <BarChart3 size={16} />,
                      title: 'Analytics & Reports',
                      desc: 'Generate detailed attendance reports and insights',
                    },
                    {
                      icon: <Shield size={16} />,
                      title: 'Secure Access',
                      desc: 'Better security for your data',
                    },
                  ].map(({ icon, title, desc }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + (0.1 * i), duration: 0.6 }}
                      className="feature-item flex items-center"
                    >
                      <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
                        {icon}
                      </div>
                      <div>
                        <div className="font-semibold">{title}</div>
                        <div className="text-sm opacity-70">{desc}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-12">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mx-auto w-full max-w-md"
              >
                <div className="mb-8 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/90 to-primary-foreground dark:from-primary-foreground/80 dark:to-primary/50 rounded-2xl flex items-center justify-center mb-6"
                  >
                    <GraduationCap className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-3xl font-extralight uppercase tracking-tighter">
                    Welcome back
                  </h2>
                  <p className="mt-1 text-sm font-light dark:text-[#9e9e9e]">
                    Sign in to access your attendance dashboard
                  </p>
                </div>

                {errors.root && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{errors.root.message}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label
                      htmlFor="account_id"
                      className="mb-2 block text-sm font-semibold tracking-tight uppercase"
                    >
                      Account ID
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="account_id"
                        type="text"
                        placeholder="Enter your account ID"
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-3 pl-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                        required
                        {...register("account_id")}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold tracking-tight uppercase"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-12 pl-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                        required
                        {...register("password")}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 cursor-pointer" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-btn cursor-pointer relative flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300 disabled:pointer-events-none disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="ml-2">Signing in...</span>
                      </>
                    ) : (
                      'Sign in to your account'
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
