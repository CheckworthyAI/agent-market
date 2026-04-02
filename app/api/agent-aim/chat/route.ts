import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;

type ChatRole = "user" | "assistant" | "system";

export type AgentAimChatMessage = { role: ChatRole; content: string };

/**
 * Streaming chat for Agent Aim. Uses OpenAI-compatible SSE (same wire format as
 * `reference/legacy-chat/api/chat`), without the full AI SDK / DB stack.
 * Set PERPLEXITY_API_KEY (preferred) or OPENAI_API_KEY.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: AgentAimChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array required" }, { status: 400 });
  }

  const sanitized = messages
    .filter(
      (m): m is AgentAimChatMessage =>
        m != null &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (sanitized.length === 0) {
    return Response.json({ error: "No valid messages" }, { status: 400 });
  }

  const usePerplexity = Boolean(process.env.PERPLEXITY_API_KEY?.trim());
  const useOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!usePerplexity && !useOpenAI) {
    return Response.json(
      {
        error:
          "Configure PERPLEXITY_API_KEY or OPENAI_API_KEY for Agent Aim chat.",
      },
      { status: 503 },
    );
  }

  const apiKey = usePerplexity
    ? process.env.PERPLEXITY_API_KEY!
    : process.env.OPENAI_API_KEY!;

  const url = usePerplexity
    ? "https://api.perplexity.ai/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = usePerplexity ? "sonar" : "gpt-4o-mini";

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are Agent Aim, a concise, accurate assistant inside Agent Market. Use markdown when it helps. If the user asks about MCP agents or the marketplace, explain clearly and practically.",
        },
        ...sanitized,
      ],
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!upstream.body) {
    return Response.json({ error: "No response body" }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
