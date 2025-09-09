"use client";

import Link from "next/link";
import { GithubIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggler } from "./toggler";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="w-fit ml-auto px-2.5 pt-1.5">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <SignedIn>
              <UserButton />
              <Link href="/dashboard">Dashboard</Link>
            </SignedIn>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Link
                href="https://github.com/clood/planetheat"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="w-4 h-4" />
              </Link>
            </Button>

            <ThemeToggler />
          </div>
        </div>
      </div>
    </nav>
  );
};
