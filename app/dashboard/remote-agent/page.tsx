import React from "react";
import A2AChat from "@/components/dashboard/remote-agent/a2a-chat";

export default function RemoteAgentPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Remote Agent Chat</h1>
        <p className="text-default-500">
          Connect and chat with an external remote agent.
        </p>
      </div>
      
      <div className="flex-grow w-full max-w-5xl">
        <A2AChat className="shadow-lg border-divider" />
      </div>
    </div>
  );
}
