import { NextRequest } from 'next/server'
import Sandbox from 'e2b'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

function encodeEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`
}

export async function POST(request: NextRequest) {
  let body: { query?: string; mode?: string; source?: string }

  try {
    body = await request.json()
  } catch {
    return new Response(encodeEvent('error', 'Invalid JSON body'), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  const { query, mode = 'search', source = 'arxiv' } = body

  if (!query || typeof query !== 'string' || !query.trim()) {
    return new Response(encodeEvent('error', 'Query is required'), {
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

        sandbox = await Sandbox.create({ mcp: { paperSearch: { source } } })

        send('status', 'Sandbox ready. Connecting to Paper Search MCP server...')

        client = new Client({ name: 'paper-mcp-client', version: '1.0.0' })

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

        const resolvedTool = tools.find((t) => t.name.includes('paper') || t.name.includes('paper_search') || t.name.includes('paper-search'))

        if (!resolvedTool) {
          send('error', `Paper search tool not found. Available tools: ${toolNames.join(', ')}`)
          return
        }

        send('status', `Calling tool: ${resolvedTool.name}...`)

        const result = await client.callTool({
          name: resolvedTool.name,
          arguments: { query: query.trim(), mode, source },
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
