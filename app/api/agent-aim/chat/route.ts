export const dynamic = "force-dynamic";
export const runtime = "edge";

import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;

const ADK_BASE_URL =
  "https://master-agent-475756125529.us-central1.run.app";
const APP_NAME = "my_agent_new";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const userMessage = messages.findLast((m) => m.role === "user")?.content ?? "";

  if (!userMessage.trim()) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  // Use the Supabase user ID as a stable ADK user ID
  const userId = `supabase-${user.id}`;

  // 1. Create a new ADK session for this conversation turn
  let sessionId: string;
  try {
    const sessionRes = await fetch(
      `${ADK_BASE_URL}/apps/${APP_NAME}/users/${userId}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      return new Response(`ADK session error: ${text}`, { status: 502 });
    }
    const sessionData = (await sessionRes.json()) as { id: string };
    sessionId = sessionData.id;
  } catch (e) {
    return new Response(`Failed to reach ADK service: ${String(e)}`, {
      status: 502,
    });
  }

  // 2. Stream the ADK response via SSE → pipe plain text back to the client
  let adkRes: Response;
  try {
    adkRes = await fetch(`${ADK_BASE_URL}/run_sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: APP_NAME,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: userMessage }],
        },
        streaming: true,
      }),
    });
  } catch (e) {
    return new Response(`Failed to reach ADK service: ${String(e)}`, {
      status: 502,
    });
  }

  if (!adkRes.ok || !adkRes.body) {
    const text = await adkRes.text().catch(() => adkRes.statusText);
    return new Response(`ADK error: ${text}`, { status: 502 });
  }

  // Transform ADK SSE events → plain text stream (matches what AgentAimPage expects)
  const encoder = new TextEncoder();
  const adkBody = adkRes.body;

  const readable = new ReadableStream({
    async start(controller) {
      const reader = adkBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        let lastSentText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const payload = line.slice(6);
                if (payload === "[DONE]") continue;

                const event = JSON.parse(payload);
                if (event.content?.role !== "model") continue;

                const fullText = (event.content.parts ?? [])
                  .map((p: any) => p.text ?? "")
                  .join("");

                if (fullText.length > lastSentText.length) {
                  const deltaContent = fullText.slice(lastSentText.length);
                  lastSentText = fullText;

                  const sseData = JSON.stringify({
                    choices: [{ delta: { content: deltaContent } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              } catch (e) {
                console.error("Error parsing upstream SSE line:", line, e);
              }
            }
          }
        }

        // Final check for any remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const payload = buffer.slice(6);
            if (payload !== "[DONE]") {
              const event = JSON.parse(payload);
              if (event.content?.role === "model") {
                const fullText = (event.content.parts ?? [])
                  .map((p: any) => p.text ?? "")
                  .join("");

                if (fullText.length > lastSentText.length) {
                  const deltaContent = fullText.slice(lastSentText.length);
                  const sseData = JSON.stringify({
                    choices: [{ delta: { content: deltaContent } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                }
              }
            }
          } catch (e) {
            // Ignore parse errors on incomplete lines
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}