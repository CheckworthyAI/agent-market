"use client";

import { Card, Button, Chip, Spinner, Tooltip } from "@heroui/react";
import React, { useEffect, useState, useRef } from "react";
import { RobotIcon } from "@/components/dashboard/icons";
import { UserAgent } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

// ADK /run returns Event[]. Extract the last model text response.
function extractReply(events: any[]): string {
  const modelEvents = events.filter(
    (e) => e.content?.role === "model" && e.content?.parts?.length > 0
  );
  if (modelEvents.length === 0) return JSON.stringify(events);
  const last = modelEvents[modelEvents.length - 1];
  return last.content.parts
    .map((p: any) => p.text ?? "")
    .join("")
    .trim();
}

const IMAGE_REGEX = /(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s\)]*)?)|(https:\/\/storage\.googleapis\.com\/[^\s\)]+)/gi;

function getImagesFromText(text: string): string[] {
  if (!text) return [];
  // Heal fragmented URLs: remove newlines that break a path
  const healed = text.replace(/([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])\n\s*([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])/g, '$1$2');
  return healed.match(IMAGE_REGEX) || [];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<(UserAgent & { checkingHealth?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Chat modal state
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<UserAgent | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "agent"; text: string }[]
  >([]);
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchAgents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("adk_agents")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const fetchedAgents = (data || []).map((a: any) => ({
        ...a,
        checkingHealth: !!a.cloud_run_url
      }));
      setAgents(fetchedAgents);

      fetchedAgents.forEach(async (agent) => {
        if (!agent.cloud_run_url) return;
        try {
          const res = await fetch("/api/agent-market/health", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: agent.cloud_run_url }),
          });
          if (res.ok) {
            const { status } = await res.json();
            setAgents((prev) =>
              prev.map((a) => (a.id === agent.id ? { ...a, status, checkingHealth: false } : a))
            );
            return;
          }
        } catch {
          console.error("Failed to check health for agent:", agent.name);
        }

        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, checkingHealth: false } : a))
        );
      });
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = (agent: UserAgent) => {
    setActiveAgent(agent);
    setChatHistory([]);
    setCurrentSessionId(
      `session-${Math.random().toString(36).substring(2, 11)}`
    );
    setIsOpen(true);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !activeAgent || isStreaming) return;

    if (!activeAgent.cloud_run_url) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: "This agent has no Cloud Run URL configured. Please deploy it first.",
        },
      ]);
      return;
    }

    const messageText = userInput.trim();
    const isFirstMessage = chatHistory.length === 0;

    setUserInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: messageText }]);
    setIsStreaming(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const appName = "my_agent_new";
      const userId = user?.id ?? currentSessionId;

      // All ADK calls go through /api/agent/chat (server-side proxy) to avoid CORS.
      // Cloud Run does not send Access-Control-Allow-Origin headers by default.

      // Step 1: Create session before the first message
      if (isFirstMessage) {
        const sessionRes = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_session",
            cloudRunUrl: activeAgent.cloud_run_url,
            appName,
            userId,
            sessionId: currentSessionId,
          }),
        });
        if (!sessionRes.ok) {
          const { error } = await sessionRes.json();
          throw new Error(error ?? "Failed to create session");
        }
      }

      // Step 2: Run the agent
      const runRes = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          cloudRunUrl: activeAgent.cloud_run_url,
          appName,
          userId,
          sessionId: currentSessionId,
          message: messageText,
        }),
      });

      if (!runRes.ok) {
        const { error } = await runRes.json();
        throw new Error(error ?? "Agent request failed");
      }

      const { events } = await runRes.json();
      const agentReply = extractReply(events);

      setChatHistory((prev) => [
        ...prev,
        { role: "agent", text: agentReply },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: `Error: ${error?.message ?? "Could not reach the agent."}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner size="lg" color="current" />
        <p className="text-default-500 animate-pulse">Loading your agents...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-default-900">My Agents</h1>
        <p className="text-default-500">
          View and manage your deployed AI agents.
        </p>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-divider rounded-2xl bg-background/40 backdrop-blur-md p-8 text-center gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-4xl mb-2">
            🔒
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <h2 className="text-2xl font-bold text-default-900">Authentication Required</h2>
            <p className="text-default-500">
              Please sign in or create an account to view and manage your personal AI agents.
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="primary"
              className="font-bold px-8 h-12 shadow-lg shadow-primary/20"
              onClick={() => router.push("/login")}
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              className="font-bold px-8 h-12"
              onClick={() => router.push("/login?mode=signup")}
            >
              Sign Up
            </Button>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-divider rounded-xl bg-background/40 backdrop-blur-md">
          <p className="text-default-500">No active agents found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          {agents.map((agent, idx) => {
            const gradients = [
              "bg-blue-500/10 text-blue-500",
              "bg-purple-500/10 text-purple-500",
              "bg-emerald-500/10 text-emerald-500",
              "bg-orange-500/10 text-orange-500",
              "bg-rose-500/10 text-rose-500",
            ];
            const colorClass = gradients[idx % gradients.length];

            return (
              <Card
                key={agent.id}
                className="bg-surface/30 border border-divider hover:border-primary/40 p-3.5 transition-all duration-300 group shadow-sm hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-xl ${colorClass} flex items-center justify-center border border-current/10 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                      <RobotIcon size={24} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="text-lg font-bold text-default-900 group-hover:text-primary transition-colors truncate">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-default-400 font-mono bg-default-100/50 px-2 py-0.5 rounded flex items-center gap-1.5">
                          ID: {agent.id.slice(0, 8)}...
                        </span>
                        {agent.cloud_run_url && (
                          <Tooltip content={agent.cloud_run_url}>
                            <span className="text-[10px] text-primary/60 font-medium px-2 py-0.5 rounded bg-primary/5 cursor-help">
                              Deployed
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 pl-0 md:pl-6 border-l-0 md:border-l border-divider/50 w-full md:w-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold mb-1.5 flex items-center gap-1">
                        Status
                      </span>
                      {agent.checkingHealth ? (
                        <div className="w-[80px] flex items-center gap-2 h-[28px]">
                          <Spinner size="sm" color="current" />
                          <span className="text-xs text-default-400">Checking</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.status === "active" ? "bg-success" : "bg-warning"}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.status === "active" ? "bg-success" : "bg-warning"}`}></span>
                          </span>
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
                            className="font-bold border-0 h-6"
                          >
                            {agent.status}
                          </Chip>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      className="font-bold px-6 h-9 shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto md:ml-0"
                      onClick={() => handleRun(agent)}
                    >
                      Run Agent
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-divider rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider bg-background/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <RobotIcon size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-default-900 text-lg leading-tight">
                    {activeAgent?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] text-default-400 font-mono truncate max-w-[240px]">
                      {activeAgent?.cloud_run_url ?? "No URL configured"}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="min-w-0 p-2 rounded-full hover:bg-default-100 transition-colors"
              >
                ✕
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 min-h-[300px]">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-default-400 gap-3 py-12">
                  <div className="w-12 h-12 bg-divider/30 rounded-full flex items-center justify-center text-2xl">
                    💬
                  </div>
                  <p>Start a conversation with your agent.</p>
                </div>
              ) : (
                chatHistory.map((chat, i) => (
                  <div
                    key={i}
                    className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${chat.role === "user"
                        ? "bg-primary text-white rounded-tr-none shadow-md"
                        : "bg-divider/30 text-default-900 rounded-tl-none border border-divider/50"
                        }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {chat.text}
                      </p>
                      {(() => {
                        const images = getImagesFromText(chat.text);
                        if (images.length === 0) return null;
                        return (
                          <div className="mt-3 flex flex-col gap-3">
                            {images.map((url, idx) => (
                              <div key={idx} className="overflow-hidden rounded-lg border border-divider/50 shadow-sm bg-black/5 min-h-[40px] flex items-center justify-center">
                                <img
                                  src={url}
                                  alt="Generated content"
                                  className="max-w-full h-auto object-contain block hover:scale-[1.02] transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-divider/30 p-4 rounded-2xl rounded-tl-none border border-divider/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-5 border-t border-divider bg-background/80 backdrop-blur-md">
              <div className="flex w-full gap-3 items-center">
                <input
                  className="flex-grow bg-divider/10 border border-divider rounded-xl px-5 py-3 text-sm outline-none focus:border-primary/60 transition-all shadow-inner disabled:opacity-50"
                  placeholder={`Chat with ${activeAgent?.name || "your agent"}...`}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isStreaming && sendMessage()
                  }
                  disabled={isStreaming}
                />
                <Button
                  variant="primary"
                  className="h-11 px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  isDisabled={isStreaming || !userInput.trim()}
                  onClick={sendMessage}
                >
                  {isStreaming ? <Spinner size="sm" color="current" /> : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
