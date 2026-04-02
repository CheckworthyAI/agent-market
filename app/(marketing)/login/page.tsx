import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/utils/supabase/server";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const supabase = await createServerClient();
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) redirect("/dashboard/agent-aim");
  } catch (e) {
    // ignore errors; fall through to render login
  }

  return <LoginClient />;
}
