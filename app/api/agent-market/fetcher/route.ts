import { NextRequest } from 'next/server'
import Sandbox from 'e2b'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

function encodeEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`
}

export async function POST(request: NextRequest) {
  let body: { url?: string; tool?: string; method?: string; headers?: Record<string, string>; body?: string }

  try {
    body = await request.json()
  } catch {
    return new Response(encodeEvent('error', 'Invalid JSON body'), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const { url, tool = 'fetch', method = 'GET', headers = {}, body: reqBody } = body

  if (!url || typeof url !== 'string' || !url.trim()) {
    return new Response(encodeEvent('error', 'URL is required'), {
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
        send('status', 'Creating E2B sandbox (fetcher)...')

        sandbox = await Sandbox.create({
          mcp: {
            'github/jae-jae/fetcher-mcp': {
              installCmd: 'npm install && npx playwright install chromium',
              runCmd: 'node build/index.js',
            },
          },
        })

        send('status', 'Sandbox ready. Connecting to fetcher MCP server...')

        client = new Client({ name: 'fetcher-mcp-client', version: '1.0.0' })

        const mcpUrl = sandbox.getMcpUrl()
        const mcpToken = await sandbox.getMcpToken()

        const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
          requestInit: {
            headers: { Authorization: `Bearer ${mcpToken}` },
          },
        })

        await client.connect(transport)

        const { tools } = await client.listTools()
        const toolNames = tools.map((t) => t.name)
        send('status', `MCP connected. Available tools: ${toolNames.join(', ')}`)

        const resolvedTool = tools.find((t) => t.name === tool || t.name.endsWith(`-${tool}`) || t.name.endsWith(`/${tool}`)) || tools[0]

        if (!resolvedTool) {
          send('error', `No tools available from fetcher MCP. Available: ${toolNames.join(', ')}`)
          return
        }

        send('status', `Calling tool: ${resolvedTool.name}...`)

        const result = await client.callTool({
          name: resolvedTool.name,
          arguments: { url: url.trim(), method: method?.toUpperCase?.() ?? 'GET', headers, body: reqBody },
        })

        send('result', result.content)
        send('done', null)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send('error', message)
      } finally {
        if (client) {
          try {
            await client.close()
          } catch {}
        }
        if (sandbox) {
          try {
            await sandbox.kill()
          } catch {}
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
