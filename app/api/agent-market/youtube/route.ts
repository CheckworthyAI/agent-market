import { NextRequest } from 'next/server'
import Sandbox from 'e2b'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export type YouTubeAction = 'get_video_info' | 'get_transcript' | 'get_timed_transcript'

const VALID_ACTIONS: YouTubeAction[] = ['get_video_info', 'get_transcript', 'get_timed_transcript']

function encodeEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`
}

export async function POST(request: NextRequest) {
  let body: { url?: string; action?: string; lang?: string }

  try {
    body = await request.json()
  } catch {
    return new Response('data: ' + JSON.stringify({ type: 'error', data: 'Invalid JSON body' }) + '\n\n', {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const { url, action, lang } = body

  if (!url || typeof url !== 'string') {
    return new Response(encodeEvent('error', 'YouTube URL is required'), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  if (!action || !VALID_ACTIONS.includes(action as YouTubeAction)) {
    return new Response(encodeEvent('error', 'Invalid action'), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  if (!process.env.E2B_API_KEY) {
    return new Response(encodeEvent('error', 'E2B_API_KEY is not configured. Please add it to your .env.local file.'), {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeEvent(type, data)))
      }

      let sandbox: InstanceType<typeof Sandbox> | undefined
      let client: Client | undefined

      try {
        send('status', 'Creating E2B sandbox...')

        sandbox = await Sandbox.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mcp: { youtubeTranscript: {} } as any,
        })

        send('status', 'Sandbox ready. Connecting to YouTube Transcript MCP server...')

        client = new Client({ name: 'youtube-mcp-client', version: '1.0.0' })

        const mcpUrl = sandbox.getMcpUrl()
        const mcpToken = await sandbox.getMcpToken()

        const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
          requestInit: {
            headers: { Authorization: `Bearer ${mcpToken}` },
          },
        })

        await client.connect(transport)

        // List all tools so we can resolve the actual (possibly namespaced) tool name.
        // E2B's MCP gateway may prefix tool names, e.g. "youtube_transcript_get_video_info".
        const { tools } = await client.listTools()
        const toolNames = tools.map((t) => t.name)
        send('status', `MCP connected. Available tools: ${toolNames.join(', ')}`)

        // Find the tool whose name matches exactly, ends with _<action>, or contains /<action>
        const resolvedTool = tools.find(
          (t) =>
            t.name === action ||
            t.name.endsWith(`_${action}`) ||
            t.name.endsWith(`/${action}`) ||
            t.name.includes(action),
        )

        if (!resolvedTool) {
          send('error', `Tool "${action}" not found. Available tools: ${toolNames.join(', ')}`)
          return
        }

        send('status', `Calling tool: ${resolvedTool.name}...`)

        const args: Record<string, string> = { url: url.trim() }
        if (lang && lang.trim()) args.lang = lang.trim()

        const result = await client.callTool({ name: resolvedTool.name, arguments: args })

        send('result', result.content)
        send('done', null)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send('error', message)
      } finally {
        if (client) {
          try {
            await client.close()
          } catch {
            // ignore cleanup errors
          }
        }
        if (sandbox) {
          try {
            await sandbox.kill()
          } catch {
            // ignore cleanup errors
          }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
