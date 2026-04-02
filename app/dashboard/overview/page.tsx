"use client";

import { Button, Card, Chip, Separator, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { UserAgent } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

import Link from "next/link";

export default function DashboardOverviewPage() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("adk_agents")
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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Spinner size="lg" color="current" />
        <p className="animate-pulse text-default-500">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Workspace Overview</h1>
        <p className="text-default-500">
          Welcome back! Manage your active AI agents and explore new opportunities.
        </p>
      </div>

      {agents.length === 0 ? (
        <section className="mt-4 flex flex-col items-center gap-6 rounded-2xl border border-divider bg-surface-secondary p-12 text-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-default-900">No active agents yet</h2>
            <p className="max-w-md text-lg text-default-500">
              Start by discovering and deploying specialized AI agents from our Agent
              MarketPlace.
            </p>
          </div>
          <Link href="/dashboard/marketplace">
            <Button variant="primary" size="lg" className="rounded-xl px-12 font-semibold">
              Explore Agent MarketPlace
            </Button>
          </Link>
        </section>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="border border-divider bg-surface p-6 transition-colors hover:bg-surface-secondary"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-default-900">{agent.name}</h2>
                <Chip
                  color={
                    agent.status === "active"
                      ? "success"
                      : agent.status === "paused"
                        ? "warning"
                        : "default"
                  }
                  size="sm"
                  variant="soft"
                >
                  {agent.status}
                </Chip>
              </div>

              <Separator className="mb-4" />

              <div className="mb-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-default-500">Resource Usage</span>
                  <span className="text-lg font-bold text-foreground">Normal</span>
                </div>
                <div className="text-xs text-default-400">ID: {agent.id.substring(0, 8)}...</div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="w-full font-medium">
                  Settings
                </Button>
                <Button variant="primary" size="sm" className="w-full font-medium">
                  {agent.status === "active" ? "Pause Task" : "Resume"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {agents.length > 0 && (
        <section className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-divider bg-surface-secondary p-8 text-center">
          <h2 className="text-2xl font-bold text-default-900">Scale Your Operations</h2>
          <p className="max-w-md text-default-500">
            Access specialized AI templates in our Agent MarketPlace to automate your
            repetitive workflows today.
          </p>
          <Link href="/dashboard/marketplace">
            <Button variant="primary" size="lg" className="rounded-xl px-12 font-semibold">
              Agent MarketPlace
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}
