import { redirect } from "next/navigation";

/** Default signed-in home: Agent Aim (workspace overview lives at `/dashboard/overview`). */
export default function DashboardPage() {
  redirect("/dashboard/agent-aim");
}
