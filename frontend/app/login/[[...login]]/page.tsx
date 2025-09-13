import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ThemeToggler } from "@/components/toggler";
import { CustomSignIn } from "./custom-signin";

export default async function Page() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated)
    redirect("/dashboard");

  return (
    <div className="min-h-[calc(100%-64px)] relative">
      <ThemeToggler className="fixed top-2 right-2" />

      <div className="w-full px-4 pb-5 lg:pb-8 pt-8 lg:pt-12">
        <CustomSignIn />
      </div>
    </div>
  );
}
