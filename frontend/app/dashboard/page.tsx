"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { StudentDashboard } from "@/components/student-dashboard";
import { RoleManager } from "@/components/role-manager";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/login');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleRoleSelected = (role: 'teacher' | 'student') => {
    setUserRole(role);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return null;
  }

  // Show role manager if user doesn't have a role set
  if (!user.unsafeMetadata?.role && !userRole) {
    return <RoleManager onRoleSelected={handleRoleSelected} />;
  }

  // Get user role from Clerk metadata or state
  const currentRole = userRole || (user.unsafeMetadata?.role as 'teacher' | 'student') || 'student';

  if (currentRole === 'teacher') {
    return <TeacherDashboard user={user} />;
  }

  return <StudentDashboard user={user} />;
}
