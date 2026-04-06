"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  Button,
  Spinner,
  Tooltip,
} from "@heroui/react";
import clsx from "clsx";
import {
  streamMessage,
  getAgentCard,
  ChatMessage,
} from "@/components/dashboard/remote-agent/a2a-client";
import {
  IconSend,
  IconPlus,
  IconMic,
  IconCopy,
  IconCheck,
} from "@/components/agent-aim/icons";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 px-1">
      <Spinner size="sm" color="current" />
      <span className="text-sm text-default-500 font-medium animate-pulse">Connecting to agent…</span>
    </div>
  );
}

const fmt = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const IMAGE_REGEX = /(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s\)]*)?)|(https:\/\/storage\.googleapis\.com\/[^\s\)]+)/gi;

function getImagesFromText(text: string): string[] {
  if (!text) return [];
  // Heal fragmented URLs: remove newlines that break a path
  const healed = text.replace(/([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])\n\s*([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])/g, '$1$2');
  return healed.match(IMAGE_REGEX) || [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type AgentStatus = "connecting" | "ready" | "error";

export default function A2AChat({
  placeholder = "Ask anything…",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<"idle" | "connecting" | "streaming">("idle");
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentDesc, setAgentDesc] = useState<string>("");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("connecting");
  const [contextId] = useState(() => crypto.randomUUID());
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch agent card on mount
  useEffect(() => {
    getAgentCard()
      .then((c) => {
        setAgentName(c.name);
        setAgentDesc(c.description);
        setAgentStatus("ready");
      })
      .catch(() => {
        setAgentName("Agent");
        setAgentDesc("Could not connect to agent");
        setAgentStatus("error");
      });
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingState]);

  const copyMessage = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedMessageId(null), 2000);
    } catch { /* ignore */ }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    if (taRef.current) taRef.current.style.height = "auto";

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date(),
    };
    const agentId = crypto.randomUUID();
    const agentMsg: ChatMessage = {
      id: agentId,
      role: "agent",
      text: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setLoading(true);
    setLoadingState("connecting");
    setStreamingId(agentId);

    try {
      let isFirstChunk = true;
      for await (const chunk of streamMessage(text, contextId)) {
        if (isFirstChunk) {
          setLoadingState("streaming");
          isFirstChunk = false;
        }

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== agentId) return m;
            let nextText = m.text;
            let nextImages = m.images || [];

            if (chunk.text) {
              nextText += chunk.text;
            }
            if (chunk.image && !nextImages.includes(chunk.image)) {
              nextImages = [...nextImages, chunk.image];
            }

            return { ...m, text: nextText, images: nextImages };
          })
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== agentId));
    } finally {
      setLoading(false);
      setLoadingState("idle");
      setStreamingId(null);
    }
  }, [input, loading, contextId]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!input.trim() && !loading;

  return (
    <div className={clsx(
      "flex flex-col h-full min-h-[520px] bg-[var(--background)] rounded-2xl border border-divider overflow-hidden shadow-sm",
      className
    )}>
      <style>{`
        .a2a-streaming::after {
          content: '▋';
          color: var(--accent);
          animation: a2a-blink .8s step-end infinite;
        }
        @keyframes a2a-blink { 50% { opacity: 0; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-divider bg-[var(--surface)]/50 backdrop-blur-md sticky top-0 z-10">
        <div className={clsx(
          "w-2 h-2 rounded-full",
          agentStatus === "ready" ? "bg-success shadow-[0_0_8px_var(--heroui-success)]" : "bg-default-400"
        )} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold tracking-tight text-foreground line-clamp-1">
            {agentName ?? "Agent"}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono line-clamp-1 opacity-70">
            {agentStatus === "connecting" ? "Connecting…" : agentStatus === "error" ? "Connection failed" : agentDesc}
          </div>
        </div>
        <div className="px-2 py-0.5 rounded-lg bg-default-100 text-[10px] font-mono font-bold text-default-600 border border-divider">
          A2A
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="text-5xl opacity-20">⬡</div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-foreground">Welcome to A2A</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                {agentStatus === "ready" ? `Ask ${agentName} anything about their capabilities.` : "Connecting to remote agent…"}
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isAgent = m.role === "agent";
          const isStreaming = m.id === streamingId;
          const showThinking = isAgent && isStreaming && loadingState === "connecting";
          const copied = copiedMessageId === m.id;

          return (
            <div key={m.id} className={clsx(
              "group flex flex-col gap-2 transition-all duration-300",
              isAgent ? "items-start" : "items-end"
            )}>
              <div className="flex items-end gap-2 max-w-[85%] group">
                <div className={clsx(
                  "relative px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed shadow-sm transition-shadow group-hover:shadow-md",
                  isAgent
                    ? "bg-[var(--surface)] border border-divider text-foreground rounded-bl-none"
                    : "bg-[var(--accent)] text-[var(--accent-foreground)] rounded-br-none"
                )}>
                  <div className={clsx(
                    "whitespace-pre-wrap word-break-break-word",
                    isStreaming && loadingState === "streaming" && "a2a-streaming"
                  )}>
                    {showThinking ? (
                      <ThinkingDots />
                    ) : (
                      <>
                        {/* 1. Render the text content */}
                        <div className="mb-0.5">{m.text || "…"}</div>

                        {/* 2. Render structured images and detected URLs */}
                        {(() => {
                          const detectedUrls = getImagesFromText(m.text);
                          const combined = Array.from(new Set([...(m.images || []), ...detectedUrls]));
                          if (combined.length === 0) return null;

                          return (
                            <div className="mt-3 flex flex-col gap-3">
                              {combined.map((url, idx) => (
                                <div key={idx} className="overflow-hidden rounded-lg border border-divider/50 shadow-sm bg-black/5 min-h-[40px] flex items-center justify-center">
                                  <img
                                    src={url}
                                    alt="Chat attachment"
                                    className="max-w-full h-auto object-contain block hover:scale-[1.02] transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                      // If we're currently streaming this message, don't hide it yet
                                      // as the URL might be incomplete.
                                      if (!isStreaming) {
                                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                      }
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>

                {/* Message Actions */}
                <div className={clsx(
                  "flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  isAgent ? "order-last ml-1" : "order-first mr-1"
                )}>
                  <Tooltip>
                    <Tooltip.Trigger aria-label={copied ? "Copied" : "Copy"}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="tertiary"
                        onPress={() => copyMessage(m.id, m.text)}
                        className="text-muted-foreground hover:bg-default-100 rounded-full h-8 w-8"
                      >
                        {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {copied ? "Copied" : "Copy"}
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
              <div className={clsx(
                "text-[10px] font-mono text-muted-foreground opacity-50 px-1",
                !isAgent && "text-right"
              )}>
                {fmt(m.timestamp)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
          <span className="text-base">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Input row */}
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-col gap-2 p-2.5 bg-[var(--surface)] border border-divider rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-default-400 focus-within:shadow-md transition-all duration-200">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder={placeholder}
            disabled={loading}
            onChange={(e) => {
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              setInput(el.value);
            }}
            onKeyDown={handleKey}
            className="w-full bg-transparent px-3 py-1.5 text-[14.5px] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[38px] max-h-40 leading-relaxed font-medium"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5">
              <Tooltip>
                <Tooltip.Trigger aria-label="Add tools">
                  <Button isIconOnly size="sm" variant="tertiary" className="text-muted-foreground/70 hover:text-foreground rounded-full h-8 w-8">
                    <IconPlus className="w-4.5 h-4.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Add tools</Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger aria-label="Voice input">
                  <Button isIconOnly size="sm" variant="tertiary" className="text-muted-foreground/70 hover:text-foreground rounded-full h-8 w-8">
                    <IconMic className="w-4.5 h-4.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Voice input</Tooltip.Content>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse mr-2">
                  Processing…
                </span>
              )}
              <Button
                isIconOnly
                size="sm"
                isDisabled={!canSend}
                onPress={handleSend}
                className={clsx(
                  "rounded-full h-8 w-8 transition-all duration-200",
                  canSend
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:shadow-lg hover:scale-105 active:scale-95"
                    : "bg-default-100 text-default-400"
                )}
                aria-label="Send message"
              >
                <IconSend className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2.5 text-[10px] text-muted-foreground/40 text-center font-mono uppercase tracking-[0.1em]">
          ↵ Send · ⇧↵ New line
        </div>
      </div>
    </div>
  );
}