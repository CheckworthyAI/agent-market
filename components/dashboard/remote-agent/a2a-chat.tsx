"use client";

// components/A2AChat.tsx
//
// Drop this anywhere:
//   import A2AChat from "@/components/A2AChat";
//   <A2AChat />

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { streamMessage, getAgentCard, ChatMessage } from "@/components/dashboard/remote-agent/a2a-client";

const S = {
  root: {
    display: "flex", flexDirection: "column" as const,
    height: "100%", minHeight: 520,
    background: "#0d0f14",
    border: "1px solid #252934",
    borderRadius: 12, overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
    color: "#e2e8f0",
  },
  hdr: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 20px", background: "#13161d",
    borderBottom: "1px solid #252934", flexShrink: 0,
  },
  dot: (on: boolean): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
    background: on ? "#6ee7b7" : "#64748b",
    boxShadow: on ? "0 0 8px #6ee7b7" : "none",
  }),
  hdrName: { fontWeight: 700, fontSize: 14, letterSpacing: ".04em", color: "#e2e8f0" },
  hdrDesc: { fontFamily: "monospace", fontSize: 11, color: "#64748b", marginTop: 2 },
  badge: {
    fontFamily: "monospace", fontSize: 10, padding: "3px 8px",
    borderRadius: 4, background: "#2d5c4a", color: "#6ee7b7",
    letterSpacing: ".05em", flexShrink: 0,
  },
  msgs: {
    flex: 1, overflowY: "auto" as const,
    padding: 20, display: "flex", flexDirection: "column" as const, gap: 16,
  },
  empty: {
    flex: 1, display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center",
    gap: 10, color: "#64748b", fontFamily: "monospace",
    fontSize: 12, textAlign: "center" as const, padding: 40,
  },
  row: (role: "user" | "agent"): React.CSSProperties => ({
    display: "flex", gap: 12,
    flexDirection: role === "user" ? "row-reverse" : "row",
  }),
  av: (role: "user" | "agent"): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 600, fontFamily: "monospace",
    background: role === "user" ? "#1e2235" : "#2d5c4a",
    border: `1px solid ${role === "user" ? "#3d4257" : "#2d5c4a"}`,
    color: "#6ee7b7",
  }),
  bwrap: (role: "user" | "agent"): React.CSSProperties => ({
    display: "flex", flexDirection: "column", maxWidth: "75%",
    alignItems: role === "user" ? "flex-end" : "flex-start",
  }),
  bub: (role: "user" | "agent"): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 10,
    borderTopRightRadius: role === "user" ? 3 : 10,
    borderTopLeftRadius: role === "agent" ? 3 : 10,
    fontSize: 13.5, lineHeight: 1.65,
    whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const,
    background: role === "user" ? "#1e2235" : "#13161d",
    border: `1px solid ${role === "user" ? "#3d4257" : "#252934"}`,
    color: "#e2e8f0",
  }),
  ts: { fontFamily: "monospace", fontSize: 10, color: "#64748b", marginTop: 4, padding: "0 2px" },
  err: {
    fontFamily: "monospace", fontSize: 12, color: "#f87171",
    background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
    borderRadius: 8, padding: "10px 14px", margin: "0 20px",
  },
  inpRow: {
    display: "flex", gap: 10, padding: "14px 16px",
    background: "#13161d", borderTop: "1px solid #252934", flexShrink: 0,
  },
  ta: {
    flex: 1, background: "#1a1d26", border: "1px solid #252934",
    borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
    fontFamily: "'Syne', sans-serif", fontSize: 13.5,
    resize: "none" as const, outline: "none", lineHeight: 1.5, minHeight: 42,
  },
  btn: (disabled: boolean): React.CSSProperties => ({
    width: 42, height: 42, background: "#6ee7b7", border: "none",
    borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, opacity: disabled ? 0.35 : 1, alignSelf: "flex-end",
  }),
  hint: { fontFamily: "monospace", fontSize: 10, color: "#64748b", padding: "0 16px 10px", textAlign: "right" as const },
};

export default function A2AChat({ placeholder = "Send a message…", className }: { placeholder?: string; className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentDesc, setAgentDesc] = useState<string>("");
  const [contextId] = useState(() => crypto.randomUUID());
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getAgentCard()
      .then((c) => { setAgentName(c.name); setAgentDesc(c.description); })
      .catch(() => setAgentName(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    if (taRef.current) taRef.current.style.height = "auto";

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text, timestamp: new Date() };
    const agentId = crypto.randomUUID();
    const agentMsg: ChatMessage = { id: agentId, role: "agent", text: "", timestamp: new Date() };

    setMessages((p) => [...p, userMsg, agentMsg]);
    setLoading(true);
    setStreamingId(agentId);

    try {
      for await (const chunk of streamMessage(text, contextId)) {
        setMessages((p) => p.map((m) => m.id === agentId ? { ...m, text: m.text + chunk } : m));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((p) => p.filter((m) => m.id !== agentId));
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  }, [input, loading, contextId]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700&display=swap');
        .a2a-ta:focus { border-color: #3d4257 !important; }
        .a2a-ta::placeholder { color: #64748b; }
        .a2a-streaming::after { content: '▋'; color: #6ee7b7; animation: a2a-blink .8s step-end infinite; }
        @keyframes a2a-blink { 50% { opacity: 0; } }
        .a2a-msg { animation: a2a-in .2s ease; }
        @keyframes a2a-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
      `}</style>
      <div style={S.root} className={className}>
        <div style={S.hdr}>
          <span style={S.dot(agentName !== null)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.hdrName}>{agentName ?? "Agent"}</div>
            <div style={S.hdrDesc}>{agentDesc || (agentName ? "" : "Connecting…")}</div>
          </div>
          <span style={S.badge}>A2A</span>
        </div>

        <div style={S.msgs}>
          {messages.length === 0 && (
            <div style={S.empty}>
              <span style={{ fontSize: 28, opacity: 0.35 }}>⬡</span>
              <span>{agentName ? `Connected to ${agentName}` : "Connecting to agent…"}</span>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="a2a-msg" style={S.row(m.role)}>
              <div style={S.av(m.role)}>{m.role === "user" ? "U" : "A"}</div>
              <div style={S.bwrap(m.role)}>
                <div
                  style={S.bub(m.role)}
                  className={m.id === streamingId ? "a2a-streaming" : ""}
                >
                  {m.text || (m.id === streamingId ? "" : "…")}
                </div>
                <div style={S.ts}>{fmt(m.timestamp)}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <div style={S.err}>⚠ {error}</div>}

        <div style={S.inpRow}>
          <textarea
            ref={taRef}
            className="a2a-ta"
            style={S.ta}
            value={input}
            placeholder={placeholder}
            disabled={loading}
            rows={1}
            onChange={(e) => {
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              setInput(el.value);
            }}
            onKeyDown={handleKey}
          />
          <button style={S.btn(!input.trim() || loading)} disabled={!input.trim() || loading} onClick={handleSend}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={S.hint}>↵ Send · ⇧↵ New line</div>
      </div>
    </>
  );
}