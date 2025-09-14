"use client";

import { useClerk } from "@clerk/nextjs";
import { CircleAlertIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/dialog";

export function LogOutBtn() {
  const { signOut } = useClerk();
  const handleSignOut = async () => await signOut();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="group relative py-2 rounded-xl font-medium border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 text-red-600 hover:text-red-700 transition-all duration-300"
        >
          <LogOut className="sm:size-5 size-4" />
          <div className="font-medium w-0 translate-x-[100%] pl-0 opacity-0 transition-all duration-300 group-hover:w-16 group-hover:translate-x-0 group-hover:pl-2 group-hover:opacity-100">
            Sign Out
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <div className="flex flex-col items-center gap-2 mb-10">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <CircleAlertIcon className="opacity-80" size={16} />
          </div>
          
          <DialogTitle className="sm:text-center">
            Are you sure you want to sign out?
          </DialogTitle>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSignOut}
            className="text-white"
          >
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
