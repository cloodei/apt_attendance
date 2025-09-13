import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { Background } from "@/components/bg";
import { UserBootstrapper } from "@/components/user-bootstrap";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <UserBootstrapper />
      <Header />
      <Background />

      <main className="relative max-w-6xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <Toaster richColors closeButton position="bottom-right" />
    </div>
  );
}
