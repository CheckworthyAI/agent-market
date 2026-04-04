"use client";

import { Card, Button, Chip, Spinner } from "@heroui/react";
import React, { useEffect, useState, useRef } from "react";
import { UserAgent } from "@/types/agent";
import { createClient } from "@/utils/supabase/client";

export default function AgentsPage() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Chat Modal State
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
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
    // Scroll to bottom when history changes
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

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

  const handleRun = (agent: UserAgent) => {
    setActiveAgent(agent);
    setChatHistory([]);
    // Using simple random ID (can be uuid or same as user_id for start as per user request)
    const sessionId = `session-${Math.random().toString(36).substring(2, 11)}`;
    setCurrentSessionId(sessionId);
    onOpen();
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !activeAgent || isStreaming) return;

    const messageText = userInput;
    setUserInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: messageText }]);
    setIsStreaming(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // TODO: Implement Supabase Edge Function call here
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Agent chat functionality is currently being migrated to Supabase Edge Functions.",
        },
      ]);

    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Sorry, I encountered an error connecting to the backend.",
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

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-divider rounded-xl bg-background/40 backdrop-blur-md">
          <p className="text-default-500">No active agents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mt-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="bg-surface border border-divider p-6 transition-colors hover:bg-surface-secondary"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-default flex items-center justify-center text-foreground font-bold text-xl">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-default-900">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-default-500 font-mono">
                      {agent.id}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">
                      Status
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
                      className="mt-1"
                    >
                      {agent.status}
                    </Chip>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">
                      Accuracy
                    </span>
                    <span className="text-sm font-bold text-default-900">
                      N/A
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-default-400 font-bold">
                      Tasks Run
                    </span>
                    <span className="text-sm font-bold text-default-900">
                      0
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="border-divider"
                      onClick={() => handleRun(agent)}
                    >
                      Run
                    </Button>
                    <Button size="sm" variant="secondary">
                      View Logs
                    </Button>
                    <Button size="sm" variant="primary">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-divider rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {activeAgent?.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-default-900">
                    {activeAgent?.name}
                  </span>
                  <span className="text-[10px] text-default-400 font-mono">
                    SID: {currentSessionId}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="min-w-0 p-2"
              >
                ✕
              </Button>
            </div>

            {/* Modal Body */}
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
                      className={`max-w-[85%] p-4 rounded-2xl ${chat.role === "user" ? "bg-primary text-white rounded-tr-none shadow-md" : "bg-divider/30 text-default-900 rounded-tl-none border border-divider/50"}`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {chat.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-divider/30 p-4 rounded-2xl rounded-tl-none border border-divider/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-divider bg-background/50">
              <div className="flex w-full gap-2 items-center">
                <input
                  className="flex-grow bg-divider/20 border border-divider/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                  placeholder="Type your message..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !isStreaming && sendMessage()
                  }
                  disabled={isStreaming}
                />
                <Button
                  variant="primary"
                  className="h-11 px-6 shadow-lg shadow-primary/20"
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
