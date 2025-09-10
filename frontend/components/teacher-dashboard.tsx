"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  Calendar,
  UserCheck,
  UserX,
  Play,
  Pause,
  Square,
  LogOut
} from "lucide-react";
import { FaceCamera } from "./face-camera";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'absent' | 'pending';
  lastSeen?: Date;
  confidence?: number;
}

interface AttendanceSession {
  id: string;
  className: string;
  date: Date;
  totalStudents: number;
  presentStudents: number;
  duration: number;
}

interface TeacherDashboardProps {
  user: any; // Clerk user object
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', status: 'present', lastSeen: new Date(), confidence: 0.95 },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', status: 'present', lastSeen: new Date(), confidence: 0.87 },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com', status: 'absent' },
    { id: '4', name: 'David Wilson', email: 'david@example.com', status: 'pending' },
    { id: '5', name: 'Eva Brown', email: 'eva@example.com', status: 'present', lastSeen: new Date(), confidence: 0.92 },
    { id: '6', name: 'Frank Miller', email: 'frank@example.com', status: 'absent' },
  ]);

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceSession[]>([
    {
      id: '1',
      className: 'Computer Science 101',
      date: new Date('2024-01-15'),
      totalStudents: 25,
      presentStudents: 22,
      duration: 45
    },
    {
      id: '2',
      className: 'Data Structures',
      date: new Date('2024-01-14'),
      totalStudents: 30,
      presentStudents: 28,
      duration: 50
    },
    {
      id: '3',
      className: 'Algorithms',
      date: new Date('2024-01-13'),
      totalStudents: 28,
      presentStudents: 25,
      duration: 40
    }
  ]);

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const pendingCount = students.filter(s => s.status === 'pending').length;

  const startAttendance = () => {
    setIsTakingAttendance(true);
    setCurrentSession(Date.now().toString());
  };

  const stopAttendance = () => {
    setIsTakingAttendance(false);
    setCurrentSession(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getStatusIcon = (status: Student['status']) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'absent':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
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
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        <div className="flex gap-3">
          {!isTakingAttendance ? (
            <Button
              onClick={startAttendance}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start Attendance
            </Button>
          ) : (
            <Button
              onClick={stopAttendance}
              variant="destructive"
              className="px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Square className="w-5 h-5 mr-2" />
              Stop Session
            </Button>
          )}
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

      {/* Stats Cards */}
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
                <p className="text-sm font-medium text-green-600">Present</p>
                <p className="text-3xl font-bold text-green-600">{presentCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-500/10 to-rose-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Absent</p>
                <p className="text-3xl font-bold text-red-600">{absentCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total</p>
                <p className="text-3xl font-bold text-blue-600">{students.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Live Attendance
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Attendance History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          {isTakingAttendance ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Camera Section */}
              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Live Face Recognition
                  </CardTitle>
                  <CardDescription>
                    Camera is actively scanning for faces. Students will be automatically marked as present.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FaceCamera label="Scanning for faces..." />
                </CardContent>
              </Card>

              {/* Student Status Grid */}
              <Card className="border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Student Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-4 rounded-xl border ${getStatusColor(student.status)} backdrop-blur-sm`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(student.status)}
                            <span className="font-medium">{student.name}</span>
                          </div>
                          <Badge variant="outline" className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{student.email}</p>
                        {student.confidence && (
                          <p className="text-xs text-muted-foreground">
                            Confidence: {Math.round(student.confidence * 100)}%
                          </p>
                        )}
                        {student.lastSeen && (
                          <p className="text-xs text-muted-foreground">
                            Last seen: {student.lastSeen.toLocaleTimeString()}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Camera className="w-12 h-12 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Ready to Start Attendance</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Click "Start Attendance" to begin the face recognition session. Students will be automatically detected and marked present.
              </p>
              <Button
                onClick={startAttendance}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Attendance Session
              </Button>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {attendanceHistory.map((session) => (
              <Card key={session.id} className="border-0 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{session.className}</h3>
                      <p className="text-sm text-muted-foreground">
                        {session.date.toLocaleDateString()} • {session.duration} minutes
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-green-600">{session.presentStudents}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{session.totalStudents}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((session.presentStudents / session.totalStudents) * 100)}% attendance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
