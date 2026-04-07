"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dropdown,
  Modal,
  Spinner,
  Tooltip,
  useOverlayState,
  Avatar,
} from "@heroui/react";
import clsx from "clsx";
import { createClient } from "@/utils/supabase/client";

type Role = "user" | "assistant";

type Msg = { id: string; role: Role; content: string; images?: string[] };

type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
};

type Agent = {
  id: string;
  name: string;
  cloud_run_url: string;
  description?: string;
};

const STORAGE_KEY = "agent-aim-chat-sessions-v1";

/** Set on redirect after auth so the first load focuses a new empty chat (query stripped on read). */
const AIM_FRESH_LOGIN_QP = "aimFresh";

/** Web Speech API (constructors not in all TS `dom` lib versions). */
type WebSpeechRecognitionEvent = {
  results: { length: number;[i: number]: { 0: { transcript: string } } };
};

type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((ev: WebSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionConstructor(): (new () => WebSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function sessionTitleFromMessages(messages: Msg[]): string {
  const first = messages.find((m) => m.role === "user" && m.content.trim());
  if (!first) return "New chat";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 56 ? `${t.slice(0, 55)}…` : t;
}

function formatSessionTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

const IMAGE_REGEX = /(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s\)]*)?)|(https:\/\/storage\.googleapis\.com\/[^\s\)]+)/gi;

function getImagesFromText(text: string): string[] {
  if (!text) return [];
  // Heal fragmented URLs: remove newlines that break a path
  const healed = text.replace(/([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])\n\s*([a-zA-Z0-9\-\._~%:\/\?#\[\]@!$&'\(\)\*\+,;=])/g, '$1$2');
  return healed.match(IMAGE_REGEX) || [];
}

function extractSseDelta(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    const chunk = json.choices?.[0]?.delta?.content;
    return typeof chunk === "string" ? chunk : null;
  } catch {
    return null;
  }
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
    </svg>
  );
}

function IconCloseRecording({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const VOICE_BAR_COUNT = 28;

function VoiceWaveform({ stream }: { stream: MediaStream | null }) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: VOICE_BAR_COUNT }, () => 0.12),
  );

  useEffect(() => {
    if (!stream) {
      let tick = 0;
      const id = window.setInterval(() => {
        tick += 1;
        setHeights(
          Array.from({ length: VOICE_BAR_COUNT }, (_, i) => {
            const wave =
              0.45 *
              Math.abs(Math.sin(tick * 0.12 + i * 0.42)) *
              (0.55 + 0.45 * Math.sin(tick * 0.05 + i * 0.2));
            return 0.1 + wave;
          }),
        );
      }, 45);
      return () => clearInterval(id);
    }

    let ctx: AudioContext | null = null;
    let raf = 0;
    let cancelled = false;

    const run = async () => {
      try {
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const loop = () => {
          if (cancelled || !analyser) return;
          analyser.getByteFrequencyData(buf);
          const step = Math.max(1, Math.floor(buf.length / VOICE_BAR_COUNT));
          const next: number[] = [];
          for (let i = 0; i < VOICE_BAR_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
              sum += buf[i * step + j] ?? 0;
            }
            const avg = sum / step / 255;
            next.push(0.1 + Math.pow(avg, 0.65) * 0.9);
          }
          setHeights(next);
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        /* show idle bars */
      }
    };

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [stream]);

  return (
    <div
      className="flex min-h-[2.75rem] min-w-0 flex-1 items-center px-1"
      aria-hidden
    >
      <div className="flex h-10 min-w-0 flex-1 items-end justify-center gap-[2px] sm:gap-0.5">
        {heights.map((h, i) => (
          <div
            key={i}
            className="w-[2px] shrink-0 rounded-full bg-zinc-900 sm:w-[3px] dark:bg-zinc-100"
            style={{
              height: `${Math.max(4, Math.round(h * 34))}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function IconBack({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}

function IconPhotosFiles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function IconAgentsMenu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M9 14h.01M15 14h.01M9 18h6" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function IconEditMessage({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

async function shareChatSession(s: ChatSession): Promise<void> {
  const lines = s.messages.map((m) =>
    `${m.role === "user" ? "You" : "Agent Aim"}: ${m.content}`,
  );
  const text = lines.filter(Boolean).join("\n\n") || s.title;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: s.title, text });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return;
    console.error(e);
  }
}

export default function AgentAimPage() {
  const router = useRouter();
  const initialIdRef = useRef<string | null>(null);
  if (initialIdRef.current === null) {
    initialIdRef.current = crypto.randomUUID();
  }

  const [sessions, setSessions] = useState<ChatSession[]>(() => [
    {
      id: initialIdRef.current!,
      title: "New chat",
      messages: [],
      updatedAt: Date.now(),
    },
  ]);
  const [activeId, setActiveId] = useState(() => initialIdRef.current!);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(
    null,
  );
  const [deleteChatLabel, setDeleteChatLabel] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // Dynamic Agent Selection
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  );

  useEffect(() => {
    const fetchAgents = async () => {
      setAgentsLoading(true);
      const supabase = createClient();
      try {
        // Fetch from both tables
        const [myAgentsRes, marketAgentsRes] = await Promise.all([
          supabase.from("adk_agents").select("id, name, cloud_run_url, description"),
          supabase.from("agent_market").select("id, name, cloud_run_url, description"),
        ]);

        const combined = [
          ...(myAgentsRes.data || []),
          ...(marketAgentsRes.data || []),
        ];
        
        // Remove duplicates by ID or URL if necessary, but here we just combine
        setAgents(combined);
        
        if (combined.length > 0) {
          setSelectedAgentId(combined[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const deleteDialog = useOverlayState({
    onOpenChange: (open) => {
      if (!open) {
        setSessionToDelete(null);
        setDeleteChatLabel("");
      }
    },
  });

  const endRef = useRef<HTMLDivElement>(null);
  const historyListRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineEditTextareaRef = useRef<HTMLTextAreaElement>(null);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const voiceInputPrefixRef = useRef("");
  const [listening, setListening] = useState(false);
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null);

  const tearDownVoiceMedia = useCallback(() => {
    setVoiceStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setListening(false);
  }, []);

  const stopVoiceRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.stop();
    } catch {
      /* */
    }
    try {
      rec?.abort?.();
    } catch {
      /* */
    }
    tearDownVoiceMedia();
  }, [tearDownVoiceMedia]);

  const cancelVoiceInput = useCallback(() => {
    setInput(voiceInputPrefixRef.current);
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    try {
      rec?.abort?.();
    } catch {
      try {
        rec?.stop();
      } catch {
        /* */
      }
    }
    tearDownVoiceMedia();
  }, [tearDownVoiceMedia]);

  const confirmVoiceInput = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) {
      tearDownVoiceMedia();
      return;
    }
    try {
      rec.stop();
    } catch {
      recognitionRef.current = null;
      tearDownVoiceMedia();
    }
  }, [tearDownVoiceMedia]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec?.abort?.();
      } catch {
        /* */
      }
      try {
        rec?.stop();
      } catch {
        /* */
      }
      setVoiceStream((s) => {
        s?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, []);

  useEffect(() => {
    let startFreshAfterAuth = false;
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get(AIM_FRESH_LOGIN_QP) === "1") {
          startFreshAfterAuth = true;
          params.delete(AIM_FRESH_LOGIN_QP);
          const q = params.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`,
          );
        }
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const data = JSON.parse(raw) as {
        sessions?: ChatSession[];
        activeId?: string;
      };
      if (
        Array.isArray(data.sessions) &&
        data.sessions.every(
          (s) =>
            s &&
            typeof s.id === "string" &&
            Array.isArray(s.messages) &&
            typeof s.updatedAt === "number",
        )
      ) {
        const loaded = data.sessions.filter((s) => s.messages.length > 0);
        if (loaded.length === 0) {
          setHydrated(true);
          return;
        }
        const preferred =
          data.activeId && loaded.some((s) => s.id === data.activeId)
            ? data.activeId
            : loaded[0].id;
        const draftId = crypto.randomUUID();
        setSessions([
          ...loaded,
          {
            id: draftId,
            title: "New chat",
            messages: [],
            updatedAt: Date.now(),
          },
        ]);
        setActiveId(startFreshAfterAuth ? draftId : preferred);
      }
    } catch {
      /* keep default */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const persisted = sessions.filter((s) => s.messages.length > 0);
      const activeSession = sessions.find((s) => s.id === activeId);
      const persistedActive =
        activeSession && activeSession.messages.length > 0
          ? activeId
          : undefined;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessions: persisted,
          ...(persistedActive ? { activeId: persistedActive } : {}),
        }),
      );
    } catch {
      /* quota / private mode */
    }
  }, [sessions, activeId, hydrated]);

  const messages = useMemo(
    () => sessions.find((s) => s.id === activeId)?.messages ?? [],
    [sessions, activeId],
  );

  const updateActiveMessages = useCallback(
    (updater: Msg[] | ((prev: Msg[]) => Msg[])) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const next =
            typeof updater === "function" ? updater(s.messages) : updater;
          return {
            ...s,
            messages: next,
            title: sessionTitleFromMessages(next),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [activeId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, editingMessageId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const copyMessageText = useCallback(async (messageId: string, text: string) => {
    if (!text) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        if (copyFeedbackTimeoutRef.current) {
          clearTimeout(copyFeedbackTimeoutRef.current);
        }
        setCopiedMessageId(messageId);
        copyFeedbackTimeoutRef.current = setTimeout(() => {
          setCopiedMessageId((id) => (id === messageId ? null : id));
          copyFeedbackTimeoutRef.current = null;
        }, 2000);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft("");
  }, []);

  const startVoiceInput = useCallback(async () => {
    if (loading || editingMessageId || recognitionRef.current) return;

    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError(
        "Voice input needs a supported browser (e.g. Chrome or Edge on desktop).",
      );
      return;
    }

    setError(null);
    voiceInputPrefixRef.current = input;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      /* animated waveform fallback if mic denied for analyser */
    }
    setVoiceStream(stream);

    const rec = new Ctor();
    rec.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event: WebSpeechRecognitionEvent) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i++) {
        spoken += event.results[i]?.[0]?.transcript ?? "";
      }
      const prefix = voiceInputPrefixRef.current;
      const combined =
        prefix && spoken && !/\s$/.test(prefix) && !/^\s/.test(spoken)
          ? `${prefix} ${spoken}`
          : `${prefix}${spoken}`;
      setInput(combined);
    };

    const onSessionEnd = () => {
      recognitionRef.current = null;
      tearDownVoiceMedia();
    };

    rec.onerror = onSessionEnd;
    rec.onend = onSessionEnd;

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      tearDownVoiceMedia();
      setError("Could not start microphone. Check permissions.");
    }
  }, [input, loading, editingMessageId, tearDownVoiceMedia]);

  const startInlineEdit = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.role !== "user" || !msg.content.trim()) return;
      stop();
      stopVoiceRecognition();
      setError(null);
      setEditingMessageId(messageId);
      setEditingDraft(msg.content);
    },
    [messages, stop, stopVoiceRecognition],
  );

  useEffect(() => {
    if (!editingMessageId) return;
    requestAnimationFrame(() => {
      const el = inlineEditTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [editingMessageId]);

  const msgActionBtn =
    "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10 data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus";

  const runStreamChat = useCallback(
    async (historyThroughUser: Msg[]) => {
      setError(null);
      const assistantId = crypto.randomUUID();
      const apiMessages = historyThroughUser.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      updateActiveMessages([
        ...historyThroughUser,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent-aim/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ 
            messages: apiMessages,
            agentUrl: selectedAgent?.cloud_run_url,
            agentName: selectedAgent?.name || "agent"
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          updateActiveMessages((prev) =>
            prev.filter((m) => m.id !== assistantId),
          );
          setError(errText || `Request failed (${res.status})`);
          return;
        }

        if (!res.body) {
          updateActiveMessages((prev) =>
            prev.filter((m) => m.id !== assistantId),
          );
          setError("No response stream");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const delta = extractSseDelta(line);
            if (delta) {
              updateActiveMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            }
          }
        }

        if (buffer.trim()) {
          const delta = extractSseDelta(buffer);
          if (delta) {
            updateActiveMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + delta }
                  : m,
              ),
            );
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        updateActiveMessages((prev) =>
          prev.filter((m) => m.id !== assistantId),
        );
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [updateActiveMessages],
  );

  const confirmInlineEdit = useCallback(async () => {
    const text = editingDraft.trim();
    if (!editingMessageId || !text) return;
    const idx = messages.findIndex((m) => m.id === editingMessageId);
    if (idx === -1) return;
    stop();
    stopVoiceRecognition();
    setError(null);
    const before = messages.slice(0, idx);
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    cancelInlineEdit();
    await runStreamChat([...before, userMsg]);
  }, [
    editingDraft,
    editingMessageId,
    messages,
    stop,
    stopVoiceRecognition,
    cancelInlineEdit,
    runStreamChat,
  ]);

  const send = useCallback(async () => {
    if (editingMessageId) return;
    stopVoiceRecognition();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    await runStreamChat([...messages, userMsg]);
  }, [
    editingMessageId,
    input,
    loading,
    messages,
    runStreamChat,
    stopVoiceRecognition,
  ]);

  const newChat = useCallback(() => {
    stop();
    stopVoiceRecognition();
    setError(null);
    setInput("");
    setEditingMessageId(null);
    setEditingDraft("");
    let nextActiveId: string | null = null;
    setSessions((prev) => {
      const nonEmpty = prev.filter((s) => s.messages.length > 0);
      const current = prev.find((s) => s.id === activeId);
      if (current && current.messages.length === 0) {
        nextActiveId = current.id;
        return [...nonEmpty, current];
      }
      const id = crypto.randomUUID();
      nextActiveId = id;
      return [
        ...nonEmpty,
        { id, title: "New chat", messages: [], updatedAt: Date.now() },
      ];
    });
    if (nextActiveId) setActiveId(nextActiveId);
  }, [stop, stopVoiceRecognition, activeId]);

  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const newChatFromHistory = useCallback(() => {
    newChat();
    closeHistory();
  }, [newChat, closeHistory]);

  const selectSession = useCallback(
    (id: string) => {
      stop();
      stopVoiceRecognition();
      setEditingMessageId(null);
      setEditingDraft("");
      setSessions((prev) => {
        const nonEmpty = prev.filter((s) => s.messages.length > 0);
        const empties = prev.filter((s) => s.messages.length === 0);
        const oneDraft = empties.length ? [empties[empties.length - 1]] : [];
        return [...nonEmpty, ...oneDraft];
      });
      setActiveId(id);
      setHistoryOpen(false);
      setError(null);
    },
    [stop, stopVoiceRecognition],
  );

  /** Only chats with at least one message appear in history */
  const historySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteDialog.isOpen) closeHistory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen, closeHistory, deleteDialog.isOpen]);

  const requestDelete = useCallback(
    (s: ChatSession) => {
      setDeleteChatLabel(s.title);
      setSessionToDelete(s);
      closeHistory();
      deleteDialog.open();
    },
    [deleteDialog, closeHistory],
  );

  const confirmDelete = useCallback(() => {
    if (!sessionToDelete) return;
    const deletedId = sessionToDelete.id;
    deleteDialog.close();

    setSessions((prev) => {
      const next = prev.filter((x) => x.id !== deletedId);
      const fallback =
        next.length === 0
          ? [
            {
              id: crypto.randomUUID(),
              title: "New chat",
              messages: [],
              updatedAt: Date.now(),
            },
          ]
          : next;

      setActiveId((aid) => (aid === deletedId ? fallback[0].id : aid));

      return fallback;
    });
  }, [sessionToDelete, deleteDialog]);

  const toolbarBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-[var(--sidebar-item-hover)] hover:text-foreground dark:hover:bg-white/10";

  const voiceChromeBtn =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/10";

  const composerSection = (
    <div className="mx-auto w-full max-w-3xl">
      {listening ? (
        <span id="agent-aim-voice-status" className="sr-only">
          Recording — speak, then press done or cancel.
        </span>
      ) : (
        <label className="sr-only" htmlFor="agent-aim-input">
          Ask anything
        </label>
      )}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const imageUrls = files
            .filter((f) => f.type.startsWith("image/"))
            .map((f) => URL.createObjectURL(f));
          if (imageUrls.length > 0) {
            // Append images to input for now? Or handle in send?
            // For now let's just alert or log as a placeholder for full upload
            console.log("Selected images:", imageUrls);
            // In a real app, we'd upload these and then add URLs to the message
            setInput((prev) => prev + (prev ? " " : "") + imageUrls.join(" "));
          }
        }}
        aria-hidden
        tabIndex={-1}
      />
      <div
        className={clsx(
          "flex min-h-[3.25rem] items-center gap-1 rounded-full border px-1.5 py-1.5 pl-2",
          listening
            ? "border-zinc-200/90 bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,0,0,0.06)] dark:border-white/12 dark:bg-zinc-900 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]"
            : clsx(
              "border-divider bg-[var(--surface)]",
              "shadow-[0_12px_40px_-12px_rgba(0,0,0,0.14),0_4px_16px_-6px_rgba(0,0,0,0.08)]",
              "dark:border-white/[0.08] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)]",
            ),
        )}
      >
        <Dropdown>
          <Dropdown.Trigger
            className={clsx(
              "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-colors",
              "data-[pressed=true]:opacity-90",
              listening
                ? "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/10"
                : clsx(
                  "text-foreground/80 hover:bg-[var(--sidebar-item-hover)] hover:text-foreground",
                ),
            )}
            aria-label="Add photos, files, or agents"
          >
            <IconPlus className={listening ? "" : "opacity-90"} />
          </Dropdown.Trigger>
          <Dropdown.Popover
            placement="top start"
            offset={10}
            className="rounded-2xl border border-divider bg-[var(--overlay)] p-1 shadow-[var(--overlay-shadow)]"
          >
            <Dropdown.Menu
              aria-label="Add to message"
              className="min-w-[13.5rem] gap-0.5 rounded-xl p-1"
            >
              <Dropdown.Item
                key="files"
                className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-[var(--sidebar-item-hover)]"
                textValue="Add photos and files"
                onPress={() => fileInputRef.current?.click()}
              >
                <span className="flex items-center gap-3">
                  <IconPhotosFiles className="shrink-0 text-default-600 dark:text-default-400" />
                  <span className="text-sm font-medium text-default-900">
                    Add photos &amp; files
                  </span>
                </span>
              </Dropdown.Item>
              <Dropdown.Item
                key="agents"
                className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-[var(--sidebar-item-hover)]"
                textValue="Agents"
                onPress={() => router.push("/agent-market")}
              >
                <span className="flex items-center gap-3">
                  <IconAgentsMenu className="shrink-0 text-default-600 dark:text-default-400" />
                  <span className="text-sm font-medium text-default-900">
                    Agents
                  </span>
                </span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        {listening ? (
          <>
            <VoiceWaveform stream={voiceStream} />
            <div className="flex shrink-0 items-center gap-0 pr-0.5">
              <button
                type="button"
                aria-label="Cancel voice input"
                title="Cancel"
                className={voiceChromeBtn}
                onClick={cancelVoiceInput}
              >
                <IconCloseRecording />
              </button>
              <button
                type="button"
                aria-label="Done recording"
                title="Done"
                className={voiceChromeBtn}
                onClick={confirmVoiceInput}
              >
                <IconCheck />
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              ref={composerTextareaRef}
              id="agent-aim-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask anything"
              disabled={loading || !!editingMessageId}
              className="min-h-[2.75rem] max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            />

            <div className="flex shrink-0 items-center gap-0.5 pr-0.5">
              {loading ? (
                <button
                  type="button"
                  className="rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--sidebar-item-hover)] hover:text-foreground"
                  onClick={stop}
                >
                  Stop
                </button>
              ) : null}
              <button
                type="button"
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  "text-foreground/80 hover:bg-[var(--sidebar-item-hover)] hover:text-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
                aria-label="Voice input"
                disabled={loading || !!editingMessageId}
                title="Speak to type (uses your browser’s speech recognition)"
                onClick={() => void startVoiceInput()}
              >
                <IconMic />
              </button>
              <button
                type="button"
                aria-label="Send message"
                disabled={loading || !!editingMessageId || !input.trim()}
                onClick={() => void send()}
                className={clsx(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity",
                  "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  "hover:opacity-90",
                )}
              >
                <IconSend />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="-m-6 flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--background)]">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute left-4 top-4 z-10 flex gap-1 sm:left-6 sm:top-5 md:left-8"
          aria-hidden={false}
        >
          <div className="pointer-events-auto flex items-center">
            <Dropdown>
              <Dropdown.Trigger>
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-full px-3 font-semibold hover:bg-[var(--sidebar-item-hover)] group border-none"
                  aria-label="Select Agent"
                >
                  <IconAgentsMenu className="h-5 w-5 shrink-0 text-default-600 dark:text-default-400" />
                  <span className="max-w-[120px] truncate text-sm">
                    {selectedAgent?.name || "Select Agent"}
                  </span>
                  <IconChevronDown className="opacity-50 group-data-[pressed=true]:rotate-180 transition-transform" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover
                placement="bottom start"
                className="min-w-[200px] rounded-2xl border border-divider bg-[var(--overlay)] p-1 shadow-[var(--overlay-shadow)]"
              >
                <Dropdown.Menu
                  aria-label="Agent selection"
                  disallowEmptySelection
                  selectionMode="single"
                  selectedKeys={selectedAgentId ? [selectedAgentId] : []}
                  onSelectionChange={(keys: any) => {
                    const key = Array.from(keys)[0] as string;
                    setSelectedAgentId(key);
                  }}
                  className="gap-1 p-1"
                >
                  {agents.map((agent) => (
                    <Dropdown.Item
                      key={agent.id}
                      className="rounded-xl py-2 data-[hovered=true]:bg-[var(--sidebar-item-hover)]"
                    >
                       <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-default-900">{agent.name}</span>
                        {agent.description && (
                          <span className="text-[10px] text-default-500 line-clamp-1">{agent.description}</span>
                        )}
                      </div>
                    </Dropdown.Item>
                  ))}
                  {agents.length === 0 && (
                     <Dropdown.Item key="no-agents" isDisabled className="text-default-400">
                      No agents found
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        <div
          className="pointer-events-none absolute right-4 top-4 z-10 flex gap-1 sm:right-6 sm:top-5"
          aria-hidden={false}
        >
          <div className="pointer-events-auto flex gap-1">
            <button
              type="button"
              className={toolbarBtn}
              aria-label="Chat history"
              onClick={openHistory}
            >
              <IconHistory />
            </button>
            <button
              type="button"
              className={toolbarBtn}
              aria-label="New chat"
              onClick={newChat}
            >
              <IconPlus />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-14 sm:px-8">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-8 px-2 py-8 text-center sm:gap-10">
              <div>
                <h2 className="text-[1.65rem] font-semibold tracking-tight text-default-900 sm:text-3xl">
                  Hello there!
                </h2>
                <p className="mt-2 max-w-md text-base text-muted-foreground sm:text-lg">
                  Agent Aim is here to help
                </p>
              </div>
              {composerSection}
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-6 pt-2">
              {messages.map((m) => {
                const copyable =
                  m.role === "assistant"
                    ? m.content.length > 0
                    : m.content.trim().length > 0;
                const isEditingUser =
                  m.role === "user" && editingMessageId === m.id;
                const copied = copiedMessageId === m.id;
                return (
                  <div
                    key={m.id}
                    className={clsx(
                      "group/message flex w-full flex-col gap-1",
                      m.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    {isEditingUser ? (
                      <div
                        className={clsx(
                          "w-full max-w-full rounded-3xl border border-divider px-4 pb-3 pt-3",
                          "bg-default-100 shadow-sm dark:bg-white/[0.06]",
                        )}
                      >
                        <label className="sr-only" htmlFor={`edit-msg-${m.id}`}>
                          Edit message
                        </label>
                        <textarea
                          ref={inlineEditTextareaRef}
                          id={`edit-msg-${m.id}`}
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelInlineEdit();
                            }
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void confirmInlineEdit();
                            }
                          }}
                          rows={4}
                          disabled={loading}
                          className="min-h-[4.5rem] w-full resize-y bg-transparent text-sm leading-relaxed text-default-900 outline-none placeholder:text-default-400 dark:text-default-100"
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            className={clsx(
                              "rounded-full border border-divider bg-[var(--background)] px-4 py-2 text-sm font-medium",
                              "text-default-900 shadow-sm transition-colors hover:bg-default-100 dark:hover:bg-white/10",
                            )}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!editingDraft.trim() || loading}
                            onClick={() => void confirmInlineEdit()}
                            className={clsx(
                              "rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm",
                              "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
                            )}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={clsx(
                            "max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                            m.role === "user"
                              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "border border-divider bg-[var(--surface)] text-default-900 shadow-sm",
                          )}
                        >
                          {m.content ||
                            (m.role === "assistant" && loading ? (
                              <span className="inline-flex items-center gap-2 text-muted-foreground">
                                <Spinner size="sm" /> Thinking…
                              </span>
                            ) : null)}

                          {/* Render images from content or Msg.images */}
                          {(() => {
                            const detectedUrls = getImagesFromText(m.content);
                            const combined = Array.from(new Set([...(m.images || []), ...detectedUrls]));
                            if (combined.length === 0) return null;

                            return (
                              <div className="mt-3 flex flex-col gap-3">
                                {combined.map((url, idx) => (
                                  <div key={idx} className="overflow-hidden rounded-lg border border-divider/50 shadow-sm bg-black/5 min-h-[40px] flex items-center justify-center">
                                    <img
                                      src={url}
                                      alt="Attachment"
                                      className="max-w-full h-auto object-contain block hover:scale-[1.02] transition-transform duration-300"
                                      loading="lazy"
                                      onError={(e) => {
                                        // If we're loading, the URL might still be incomplete
                                        if (!loading) {
                                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        {copyable ? (
                          <div
                            className={clsx(
                              "flex items-center gap-0.5 transition-opacity duration-150",
                              "opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100",
                              m.role === "user"
                                ? "justify-end pr-0.5"
                                : "justify-start pl-0.5",
                            )}
                          >
                            <Tooltip>
                              <Tooltip.Trigger
                                aria-label={
                                  copied ? "Copied" : "Copy message"
                                }
                                className={clsx(
                                  msgActionBtn,
                                  copied &&
                                  "bg-default-200 text-default-900 dark:bg-white/15",
                                )}
                                onClick={() =>
                                  void copyMessageText(m.id, m.content)
                                }
                              >
                                {copied ? <IconCheck /> : <IconCopy />}
                              </Tooltip.Trigger>
                              <Tooltip.Content
                                className={clsx(
                                  "rounded-full border-0 bg-foreground px-3 py-1.5 text-xs font-medium",
                                  "text-background shadow-lg",
                                )}
                              >
                                {copied ? "Copied" : "Copy message"}
                              </Tooltip.Content>
                            </Tooltip>
                            {m.role === "user" ? (
                              <Tooltip>
                                <Tooltip.Trigger
                                  aria-label="Edit message"
                                  className={msgActionBtn}
                                  onClick={() => startInlineEdit(m.id)}
                                >
                                  <IconEditMessage />
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                  className={clsx(
                                    "rounded-full border-0 bg-foreground px-3 py-1.5 text-xs font-medium",
                                    "text-background shadow-lg",
                                  )}
                                >
                                  Edit message
                                </Tooltip.Content>
                              </Tooltip>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 border-t border-divider bg-[var(--surface)] px-4 py-2 sm:px-8">
            <p className="mx-auto max-w-3xl text-sm text-danger">{error}</p>
          </div>
        )}

        {messages.length > 0 ? (
          <div
            className={clsx(
              "shrink-0 border-t border-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3",
              "bg-[var(--background)]/95 backdrop-blur-md sm:px-8 sm:pb-8",
            )}
          >
            {composerSection}
          </div>
        ) : null}
      </div>

      {historyOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[300] bg-[var(--scrim)]"
            aria-label="Close chat history"
            onClick={closeHistory}
          />
          <div
            className="fixed right-0 top-0 z-[301] flex h-full w-full max-w-md flex-col rounded-l-2xl border-l border-divider bg-[var(--surface-secondary)] shadow-2xl sm:my-2 sm:mr-2 sm:h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-1rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-aim-history-title"
          >
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-divider px-3 py-3">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className={toolbarBtn}
                  aria-label="Back"
                  onClick={closeHistory}
                >
                  <IconBack />
                </button>
                <button
                  type="button"
                  className={toolbarBtn}
                  aria-label="New chat"
                  onClick={newChat}
                >
                  <IconPlus />
                </button>
              </div>
              <h2
                id="agent-aim-history-title"
                className="text-center text-base font-semibold text-default-900"
              >
                Chat history
              </h2>
              <button
                type="button"
                className={clsx(toolbarBtn, "justify-self-end")}
                aria-label="Scroll to most recent"
                title="Most recent first"
                onClick={() =>
                  historyListRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }
              >
                <IconHistory />
              </button>
            </div>

            <div
              ref={historyListRef}
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              {historySessions.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No chats yet
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {historySessions.map((s) => (
                    <li key={s.id}>
                      <div
                        className={clsx(
                          "flex items-stretch gap-0.5 rounded-xl transition-colors",
                          s.id === activeId
                            ? "bg-[var(--sidebar-item-active)]"
                            : "hover:bg-[var(--sidebar-item-hover)]",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => selectSession(s.id)}
                          className="min-w-0 flex-1 px-3 py-3 text-left"
                        >
                          <span className="line-clamp-2 text-sm font-medium text-default-900">
                            {s.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {formatSessionTime(s.updatedAt)}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center pr-1">
                          <Dropdown>
                            <Dropdown.Trigger
                              className={clsx(
                                toolbarBtn,
                                "text-foreground/80",
                              )}
                              aria-label={`Options for ${s.title}`}
                            >
                              <IconMore />
                            </Dropdown.Trigger>
                            <Dropdown.Popover placement="bottom end">
                              <Dropdown.Menu aria-label="Chat options">
                                <Dropdown.Item
                                  key="share"
                                  textValue="Share"
                                  onPress={() => void shareChatSession(s)}
                                >
                                  <span className="flex items-center gap-2 text-sm text-default-900">
                                    <IconShare />
                                    Share
                                  </span>
                                </Dropdown.Item>
                                <Dropdown.Item
                                  key="delete"
                                  textValue="Delete"
                                  className="text-danger data-[hovered=true]:bg-danger/10"
                                  onPress={() => requestDelete(s)}
                                >
                                  <span className="flex items-center gap-2 text-sm text-danger">
                                    <IconTrash className="text-danger" />
                                    Delete
                                  </span>
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-divider bg-[var(--surface)] p-4">
              <Button
                fullWidth
                variant="primary"
                className="rounded-xl py-3 font-semibold"
                onPress={newChatFromHistory}
              >
                New Chat
              </Button>
            </div>
          </div>
        </>
      ) : null}

      {/* Container must be nested inside Backdrop so both portal to document.body; siblings break positioning */}
      <Modal.Root state={deleteDialog}>
        <Modal.Backdrop className="z-[420]">
          <Modal.Container
            placement="center"
            size="md"
            className="min-h-0"
          >
            <Modal.Dialog className="border border-divider shadow-xl">
              <Modal.Header>
                <Modal.Heading className="text-lg font-semibold text-default-900">
                  Delete chat
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm leading-relaxed text-default-700">
                  Are you sure you want to delete the chat &quot;{deleteChatLabel}
                  &quot;? This action cannot be undone.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex flex-row justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  className="rounded-xl border border-divider"
                  onPress={() => deleteDialog.close()}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="rounded-xl font-semibold"
                  onPress={confirmDelete}
                >
                  Delete
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
