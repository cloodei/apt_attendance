"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  History,
  Camera,
  LogOut
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface AttendanceRecord {
  id: string;
  className: string;
  date: Date;
  status: 'present' | 'absent' | 'late';
  timeIn?: Date;
  timeOut?: Date;
  duration?: number;
}

interface AttendanceStats {
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  lateClasses: number;
  attendanceRate: number;
  currentStreak: number;
  longestStreak: number;
}

interface StudentDashboardProps {
  user: any; // Clerk user object
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalClasses: 45,
    presentClasses: 38,
    absentClasses: 5,
    lateClasses: 2,
    attendanceRate: 84.4,
    currentStreak: 7,
    longestStreak: 15
  });

  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([
    {
      id: '1',
      className: 'Computer Science 101',
      date: new Date('2024-01-15'),
      status: 'present',
      timeIn: new Date('2024-01-15T09:00:00'),
      timeOut: new Date('2024-01-15T10:30:00'),
      duration: 90
    },
    {
      id: '2',
      className: 'Data Structures',
      date: new Date('2024-01-14'),
      status: 'present',
      timeIn: new Date('2024-01-14T11:00:00'),
      timeOut: new Date('2024-01-14T12:30:00'),
      duration: 90
    },
    {
      id: '3',
      className: 'Algorithms',
      date: new Date('2024-01-13'),
      status: 'late',
      timeIn: new Date('2024-01-13T14:15:00'),
      timeOut: new Date('2024-01-13T15:45:00'),
      duration: 90
    },
    {
      id: '4',
      className: 'Database Systems',
      date: new Date('2024-01-12'),
      status: 'present',
      timeIn: new Date('2024-01-12T10:00:00'),
      timeOut: new Date('2024-01-12T11:30:00'),
      duration: 90
    },
    {
      id: '5',
      className: 'Software Engineering',
      date: new Date('2024-01-11'),
      status: 'absent'
    }
  ]);

  const getStatusIcon = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'late':
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'absent':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'late':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-cyan-400 to-foreground bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Status</p>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Present Today
            </Badge>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="px-6 py-3 rounded-xl font-medium border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 text-red-600 hover:text-red-700 transition-all duration-300"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Attendance Rate</p>
                <p className={`text-3xl font-bold ${getAttendanceRateColor(attendanceStats.attendanceRate)}`}>
                  {attendanceStats.attendanceRate}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Current Streak</p>
                <p className="text-3xl font-bold text-blue-600">{attendanceStats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <Award className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Best Streak</p>
                <p className="text-3xl font-bold text-purple-600">{attendanceStats.longestStreak}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Total Classes</p>
                <p className="text-3xl font-bold text-orange-600">{attendanceStats.totalClasses}</p>
                <p className="text-xs text-muted-foreground">attended</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Attendance History
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Attendance Chart Placeholder */}
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Attendance Trend
                </CardTitle>
                <CardDescription>
                  Your attendance performance over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl border border-border/20">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">Chart visualization would go here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Present</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{attendanceStats.presentClasses}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Late</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">{attendanceStats.lateClasses}</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Absent</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{attendanceStats.absentClasses}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {recentAttendance.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(record.status)}
                        <div>
                          <h3 className="text-lg font-semibold">{record.className}</h3>
                          <p className="text-sm text-muted-foreground">
                            {record.date.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                          {record.timeIn && (
                            <p className="text-xs text-muted-foreground">
                              {record.timeIn.toLocaleTimeString()} - {record.timeOut?.toLocaleTimeString()}
                              {record.duration && ` (${record.duration} min)`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">John Doe</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                  <p className="text-lg font-semibold">STU-2024-001</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg font-semibold">john.doe@university.edu</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Program</label>
                  <p className="text-lg font-semibold">Computer Science</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Face Recognition
                </CardTitle>
                <CardDescription>
                  Your face recognition profile and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-12 h-12 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Face Profile Active</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your face recognition profile is set up and ready for automatic attendance.
                  </p>
                  <Button variant="outline" className="w-full">
                    Update Face Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
