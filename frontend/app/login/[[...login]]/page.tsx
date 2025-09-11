import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInCustom } from "./signin-custom";
import { ThemeToggler } from "@/components/toggler";

export default async function Page() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated)
    redirect("/dashboard");

  return (
    <div className="min-h-screen relative">
      <ThemeToggler className="fixed top-2 right-2" />

      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-center px-4 py-8">
        <SignInCustom />
      </div>
    </div>
  );
}
