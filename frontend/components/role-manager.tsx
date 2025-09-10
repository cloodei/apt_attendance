"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, CheckCircle } from "lucide-react";

interface RoleManagerProps {
  onRoleSelected: (role: 'teacher' | 'student') => void;
}

export function RoleManager({ onRoleSelected }: RoleManagerProps) {
  const { user } = useUser();
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleSelect = async (role: 'teacher' | 'student') => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      // Update user's public metadata with the selected role
      await user.update({
        unsafeMetadata: {
          // ...user.unsafeMetadata,
          role: role
        }
      });
      
      setSelectedRole(role);
      onRoleSelected(role);
    } catch (error) {
      console.error("Error updating user role:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if user already has a role set
  useEffect(() => {
    if (user?.unsafeMetadata?.role) {
      const role = user.unsafeMetadata.role as 'teacher' | 'student';
      setSelectedRole(role);
      onRoleSelected(role);
    }
  }, [user, onRoleSelected]);

  // If user already has a role, don't show the role selection
  if (user?.unsafeMetadata?.role) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md border-0 bg-card/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Select Your Role
          </CardTitle>
          <CardDescription>
            Choose your role to access the appropriate dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleRoleSelect('student')}
                disabled={isUpdating}
                className="w-full h-20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-400/30 hover:border-cyan-400/50 text-foreground flex flex-col items-center gap-2"
              >
                <GraduationCap className="w-8 h-8 text-cyan-400" />
                <div className="text-center">
                  <div className="font-semibold">Student</div>
                  <div className="text-sm text-muted-foreground">Track your attendance</div>
                </div>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleRoleSelect('teacher')}
                disabled={isUpdating}
                className="w-full h-20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-400/30 hover:border-blue-400/50 text-foreground flex flex-col items-center gap-2"
              >
                <Users className="w-8 h-8 text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold">Teacher</div>
                  <div className="text-sm text-muted-foreground">Manage attendance</div>
                </div>
              </Button>
            </motion.div>
          </div>

          {isUpdating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 text-muted-foreground"
            >
              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              <span>Setting up your dashboard...</span>
            </motion.div>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              You can change your role later in your profile settings
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
