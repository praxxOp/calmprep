import { redirect } from "next/navigation";

import { getAuth } from "@/lib/supabase/auth";
import { CompanionChat } from "./components/companion-chat";

export const metadata = { title: "AI Companion · Saathi" };

export default async function CompanionPage() {
  const auth = await getAuth();
  if (!auth) {
    redirect("/dashboard/login");
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">AI Companion</h1>
        <p className="text-muted-foreground text-sm">
          A calm space to talk through exam stress, focus, and how you&apos;re feeling.
        </p>
      </div>
      <CompanionChat />
    </div>
  );
}
