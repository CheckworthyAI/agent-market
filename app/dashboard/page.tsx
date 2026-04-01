"use client";

import { title, subtitle } from "@/components/primitives";
import { Card, Separator, Button, Chip, Spinner } from "@heroui/react";
import React, { useEffect, useState } from "react";
import { UserAgent } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

import Link from "next/link";

export default function DashboardPage() {
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
        <p className="text-default-500 animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">Workspace Overview</h1>
        <p className="text-default-500">Welcome back! Manage your active AI agents and explore new opportunities.</p>
      </div>

      {agents.length === 0 ? (
        <section className="bg-primary/5 rounded-3xl p-12 border border-primary/10 flex flex-col items-center text-center gap-6 mt-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-default-900">No active agents yet</h2>
            <p className="max-w-md text-default-500 text-lg">
              Start by discovering and deploying specialized AI agents from our Marketplace.
            </p>
          </div>
          <Link href="/dashboard/marketplace">
            <Button 
              variant="primary" 
              size="lg" 
              className="px-12 font-bold shadow-lg shadow-primary/30 rounded-full"
            >
              Explore Marketplace
            </Button>
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="bg-background/60 backdrop-blur-md border border-divider p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-default-900">{agent.name}</h2>
                <Chip
                  color={agent.status === "active" ? "success" : agent.status === "paused" ? "warning" : "default"}
                  size="sm"
                  variant="soft"
                >
                  {agent.status}
                </Chip>
              </div>
              
              <Separator className="mb-4" />
              
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-default-500">Resource Usage</span>
                  <span className="text-lg font-bold text-primary">Normal</span>
                </div>
                <div className="text-xs text-default-400">
                  ID: {agent.id.substring(0, 8)}...
                </div>
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
        <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10 flex flex-col items-center text-center gap-4 mt-8">
          <h2 className="text-2xl font-bold text-default-900">Scale Your Operations</h2>
          <p className="max-w-md text-default-500">
            Access specialized AI templates in our Marketplace to automate your repetitive workflows today.
          </p>
          <Link href="/dashboard/marketplace">
            <Button variant="primary" size="lg" className="px-12 font-bold shadow-lg shadow-primary/30 rounded-full">
              Marketplace
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}
