import { redirect } from "next/navigation";

// Entry point → the AI Companion (primary tab). Middleware sends unauthenticated
// visitors to /dashboard/login.
export default function Home() {
  redirect("/dashboard/companion");
}
