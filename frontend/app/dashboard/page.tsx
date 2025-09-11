import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import Layout from "@/components/root-layout";

export default function Wrapped() {
  return (
    <Layout>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </Suspense>
    </Layout>
  );
}

async function DashboardPage() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated)
    redirect("/login");

  return <TeacherDashboard />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 mt-10">
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
    </div>
  );
}
