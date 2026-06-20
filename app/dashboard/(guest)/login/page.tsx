import { Suspense } from "react";
import Link from "next/link";
import { HeartHandshakeIcon } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · Saathi",
  description: "Sign in to your Saathi wellness companion."
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <HeartHandshakeIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to check in with Saathi, your wellness companion.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="text-muted-foreground text-center text-sm">
          New here?{" "}
          <Link href="/dashboard/register" className="text-foreground font-medium underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
