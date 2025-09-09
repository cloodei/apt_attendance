"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function Page() {
  return (
    <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div className="relative hidden lg:block">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 blur-2xl" />
        <div className="relative rounded-3xl border border-border/60 bg-card/40 backdrop-blur p-8 h-[520px] flex flex-col justify-between overflow-hidden">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Automated Attendance</h2>
            <p className="text-muted-foreground mt-2">Face recognition • Real-time streaming • Zero friction</p>
          </div>
          <div className="relative mx-auto">
            <Image src="/globe.svg" alt="face recognition" width={200} height={200} className="opacity-80" />
          </div>
          <div className="text-xs text-muted-foreground/80">Securely powered by Clerk authentication</div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur p-6 w-full max-w-md">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">Use your Student/Teacher account to continue</p>
          </div>
          <SignIn routing="path" path="/login" signUpUrl="/login/sign-up" appearance={{ variables: { colorPrimary: "#22d3ee" } }} />
        </div>
      </div>
    </div>
  );
}
