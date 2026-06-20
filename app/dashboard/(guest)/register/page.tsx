import Link from "next/link";
import { HeartHandshakeIcon } from "lucide-react";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create account · Saathi",
  description: "Create your Saathi wellness companion account."
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <HeartHandshakeIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm">
            Start tracking your wellbeing through exam season with Saathi.
          </p>
        </div>

        <RegisterForm />

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/dashboard/login" className="text-foreground font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
