"use client";

import { Card, Button, Chip, Separator, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { UserAgent } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

export default function AgentsPage() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_agents")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" color="accent" />
        <p className="text-default-500 animate-pulse">Loading your agents...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">My Agents</h1>
        <p className="text-default-500">View and manage your deployed AI agents.</p>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-divider rounded-xl bg-background/40 backdrop-blur-md">
          <p className="text-default-500">No active agents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mt-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="bg-background/60 backdrop-blur-md border border-divider p-6 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-default-900">{agent.name}</h3>
                    <p className="text-xs text-default-500 font-mono">{agent.id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">Status</span>
                    <Chip
                      color={agent.status === "active" ? "success" : agent.status === "paused" ? "warning" : "default"}
                      size="sm"
                      variant="soft"
                      className="mt-1"
                    >
                      {agent.status}
                    </Chip>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">Accuracy</span>
                    <span className="text-sm font-bold text-default-900">N/A</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">Tasks Run</span>
                    <span className="text-sm font-bold text-default-900">0</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary">View Logs</Button>
                    <Button size="sm" variant="primary">Configure</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

