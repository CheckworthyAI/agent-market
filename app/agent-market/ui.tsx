"use client"

import React, { useState, useRef } from 'react'

// Shared types
export type MCPContentItem =
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource' }

type StreamEvent =
    | { type: 'status'; data: string }
    | { type: 'result'; data: MCPContentItem[] }
    | { type: 'error'; data: string }
    | { type: 'done'; data: null }

// Reusable streaming hook
export function useStreamingCall(endpoint: string) {
    const [loading, setLoading] = useState(false)
    const [statusMessages, setStatusMessages] = useState<string[]>([])
    const [result, setResult] = useState<MCPContentItem[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)

    const call = async (body: Record<string, unknown>) => {
        if (abortRef.current) abortRef.current.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setLoading(true)
        setStatusMessages([])
        setResult(null)
        setError(null)

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            })

            if (!response.body) {
                setError('No response stream')
                setLoading(false)
                return
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() ?? ''
                for (const line of lines) {
                    const stripped = line.replace(/^data: /, '').trim()
                    if (!stripped) continue
                    try {
                        const event: StreamEvent = JSON.parse(stripped)
                        if (event.type === 'status') setStatusMessages((p) => [...p, event.data as string])
                        else if (event.type === 'result') setResult(event.data as MCPContentItem[])
                        else if (event.type === 'error') setError(event.data as string)
                        else if (event.type === 'done') setLoading(false)
                    } catch { /* skip */ }
                }
            }
        } catch (err) {
            if ((err as Error).name === 'AbortError') return
            setError(err instanceof Error ? err.message : 'Request failed')
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        if (abortRef.current) abortRef.current.abort()
        setLoading(false)
        setStatusMessages([])
        setResult(null)
        setError(null)
    }

    return { loading, statusMessages, result, error, call, reset }
}

export function StatusStream({ loading, messages }: { loading: boolean; messages: string[] }) {
    if (!loading && messages.length === 0) return null
    return (
        <div className="space-y-1.5">
            {messages.map((msg, i) => {
                const isLast = loading && i === messages.length - 1
                return (
                    <div
                        key={i}
                        className={`flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-lg border transition-all ${isLast
                            ? 'text-foreground bg-muted/60 border-border'
                            : 'text-muted-foreground bg-muted/30 border-border/30'
                            }`}
                    >
                        {isLast ? (
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                            </span>
                        ) : (
                            <span className="text-emerald-600 dark:text-emerald-500 text-xs font-bold flex-shrink-0">{'\u0003'}</span>
                        )}
                        {msg}
                    </div>
                )
            })}
        </div>
    )
}

export function ErrorBox({ error }: { error: string }) {
    return (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-5 py-4 text-sm text-destructive flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{'\u26A0\uFE0F'}</span>
            <div>
                <div className="font-semibold mb-1">Error</div>
                <div>{error}</div>
            </div>
        </div>
    )
}

export function YouTubeTab() {
    const [url, setUrl] = useState('')
    const [lang, setLang] = useState('')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/youtube')

    const runAction = (action: string) => {
        if (!url.trim()) return
        call({ url: url.trim(), action, lang: lang.trim() || undefined })
    }

    const EXAMPLE_URLS = [
        { label: 'Rick Astley – Never Gonna Give You Up', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { label: 'TED: The power of vulnerability', url: 'https://www.youtube.com/watch?v=iCvmsMzlF7o' },
        { label: 'Fireship – 100s of TypeScript', url: 'https://www.youtube.com/watch?v=zQnBQ4tB3ZA' },
    ]

    const YT_ACTIONS = [
        { id: 'get_video_info', label: 'Video Info', icon: '\u{1F3AC}', description: 'Title, author, description & metadata', color: 'from-violet-600 to-purple-600' },
        { id: 'get_transcript', label: 'Transcript', icon: '\u{1F4DD}', description: 'Full plain-text transcript', color: 'from-blue-600 to-cyan-600' },
        { id: 'get_timed_transcript', label: 'Timed Transcript', icon: '\u23F1\uFE0F', description: 'Transcript with timestamps', color: 'from-emerald-600 to-teal-600' },
    ]

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="yt-url">YouTube URL</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">{'\u{1F517}'}</span>
                        <input
                            id="yt-url"
                            type="url"
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); reset() }}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-muted/70 border border-border rounded-xl pl-9 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
                            disabled={loading}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                        {EXAMPLE_URLS.map((ex) => (
                            <button
                                key={ex.url}
                                onClick={() => { setUrl(ex.url); reset() }}
                                className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted border border-border rounded-full px-3 py-1 transition"
                            >
                                {ex.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="lang">
                        Language{' '}
                        <span className="text-muted-foreground font-normal">(optional — e.g. <code className="text-xs">en</code>, <code className="text-xs">es</code>)</span>
                    </label>
                    <input
                        id="lang"
                        type="text"
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        placeholder="en"
                        maxLength={10}
                        className="w-28 bg-muted/70 border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
                        disabled={loading}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {YT_ACTIONS.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => runAction(action.id)}
                            disabled={loading || !url.trim()}
                            className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 bg-gradient-to-br ${action.color} hover:scale-[1.02] hover:shadow-lg active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100`}
                        >
                            <div className="text-2xl mb-2">{action.icon}</div>
                            <div className="font-semibold text-sm">{action.label}</div>
                            <div className="text-xs opacity-80 mt-0.5">{action.description}</div>
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
                        </button>
                    ))}
                </div>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-muted/30">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400">{'\u2713'}</span> Result
                        </span>
                        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition">Clear</button>
                    </div>
                    <div className="p-5 max-h-[34rem] overflow-y-auto">
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                </div>
            )}

        </div>
    )
}

// Generic panel used for non-YouTube agents
// Perplexity types
type PerplexityTool = 'perplexity_ask' | 'perplexity_reason' | 'perplexity_research'

const PERPLEXITY_TOOLS: { id: PerplexityTool; label: string; icon: string; description: string; color: string }[] = [
    { id: 'perplexity_ask', label: 'Ask', icon: '\u{1F50D}', description: 'Fast web-grounded answer', color: 'from-sky-600 to-blue-600' },
    { id: 'perplexity_reason', label: 'Reason', icon: '\u{1F9E0}', description: 'Deep reasoning over your question', color: 'from-violet-600 to-purple-600' },
    { id: 'perplexity_research', label: 'Research', icon: '\u{1F4DA}', description: 'In-depth multi-source research', color: 'from-emerald-600 to-teal-600' },
]

const PERPLEXITY_EXAMPLE_QUERIES = [
    'What are the latest breakthroughs in quantum computing?',
    'Explain the differences between React Server Components and Client Components',
    'What is the current state of fusion energy research?',
]

// Wikipedia types
type WikipediaTool =
    | 'search_wikipedia'
    | 'get_summary'
    | 'get_article'
    | 'extract_key_facts'
    | 'get_related_topics'
    | 'summarize_article_for_query'

const WIKIPEDIA_TOOLS: { id: WikipediaTool; label: string; icon: string; description: string; color: string; argLabel: string; argPlaceholder: string }[] = [
    { id: 'search_wikipedia', label: 'Search', icon: '\u{1F50E}', description: 'Search Wikipedia for articles', color: 'from-blue-600 to-sky-600', argLabel: 'Search query', argPlaceholder: 'e.g. Quantum computing' },
    { id: 'get_summary', label: 'Summary', icon: '\u{1F4C4}', description: 'Get a concise summary of an article', color: 'from-emerald-600 to-teal-600', argLabel: 'Article title', argPlaceholder: 'e.g. Albert Einstein' },
    { id: 'get_article', label: 'Full Article', icon: '\u{1F4DA}', description: 'Retrieve the full article content', color: 'from-violet-600 to-purple-600', argLabel: 'Article title', argPlaceholder: 'e.g. JavaScript' },
    { id: 'extract_key_facts', label: 'Key Facts', icon: '\u{1F9E0}', description: 'Extract key facts from an article', color: 'from-amber-600 to-orange-600', argLabel: 'Article title', argPlaceholder: 'e.g. Black hole' },
    { id: 'get_related_topics', label: 'Related Topics', icon: '\u{1F517}', description: 'Get related topics via links & categories', color: 'from-pink-600 to-rose-600', argLabel: 'Article title', argPlaceholder: 'e.g. Machine learning' },
    { id: 'summarize_article_for_query', label: 'Query Summary', icon: '\u{1F4AC}', description: 'Article snippet focused on your specific query', color: 'from-cyan-600 to-blue-500', argLabel: 'Topic & query', argPlaceholder: 'e.g. Einstein relativity' },
]

const WIKIPEDIA_EXAMPLES: { tool: WikipediaTool; label: string; value: string }[] = [
    { tool: 'search_wikipedia', label: 'Search: TypeScript', value: 'TypeScript programming language' },
    { tool: 'get_summary', label: 'Summary: Marie Curie', value: 'Marie Curie' },
    { tool: 'get_article', label: 'Article: React (web)', value: 'React (software)' },
    { tool: 'extract_key_facts', label: 'Facts: Black hole', value: 'Black hole' },
    { tool: 'get_related_topics', label: 'Related: Deep learning', value: 'Deep learning' },
]

// Airbnb types
type AirbnbTool = 'airbnb_search' | 'airbnb_listing_details'

const AIRBNB_TOOLS: { id: AirbnbTool; label: string; icon: string; description: string; color: string }[] = [
    { id: 'airbnb_search', label: 'Search Listings', icon: '\u{1F50D}', description: 'Search by location with filters', color: 'from-rose-600 to-pink-600' },
    { id: 'airbnb_listing_details', label: 'Listing Details', icon: '\u{1F3E0}', description: 'Full details for a specific listing ID', color: 'from-orange-600 to-amber-600' },
]

const AIRBNB_LOCATION_EXAMPLES = [
    'New York, NY',
    'Paris, France',
    'Tokyo, Japan',
    'Barcelona, Spain',
]

// HackerNews types
type HackerNewsTool = 'search_stories' | 'get_stories' | 'get_story_info' | 'get_user_info'

const HN_TOOLS: { id: HackerNewsTool; label: string; icon: string; description: string; color: string }[] = [
    { id: 'search_stories', label: 'Search Stories', icon: '\u{1F50D}', description: 'Search stories by keyword', color: 'from-orange-600 to-amber-600' },
    { id: 'get_stories', label: 'Browse Stories', icon: '\u{1F4CB}', description: 'Top, new, Ask HN or Show HN stories', color: 'from-rose-600 to-orange-600' },
    { id: 'get_story_info', label: 'Story Details', icon: '\u{1F4AC}', description: 'Full story and comments by ID', color: 'from-violet-600 to-purple-600' },
    { id: 'get_user_info', label: 'User Profile', icon: '\u{1F464}', description: 'Profile and submitted stories for a user', color: 'from-teal-600 to-cyan-600' },
]

const HN_STORY_TYPES = [
    { id: 'top', label: '\uD83D\uDD25 Top' },
    { id: 'new', label: '\u2728 New' },
    { id: 'ask_hn', label: '\u2753 Ask HN' },
    { id: 'show_hn', label: '\uD83D\uDE80 Show HN' },
]

const HN_EXAMPLES: { tool: HackerNewsTool; label: string; value: string }[] = [
    { tool: 'search_stories', label: 'Search: Next.js 15', value: 'Next.js 15' },
    { tool: 'search_stories', label: 'Search: AI agents', value: 'AI agents' },
    { tool: 'get_user_info', label: 'User: dang', value: 'dang' },
    { tool: 'get_user_info', label: 'User: pg', value: 'pg' },
]

// Paper Search types
type PaperMode = 'search' | 'read' | 'download'
type PaperSource = 'arxiv' | 'pubmed' | 'biorxiv' | 'medrxiv' | 'semantic' | 'crossref' | 'google_scholar' | 'iacr'

const PAPER_MODES: { id: PaperMode; label: string; icon: string; description: string; color: string }[] = [
    { id: 'search', label: 'Search', icon: '\u{1F50D}', description: 'Search by keyword across a database', color: 'from-indigo-600 to-blue-600' },
    { id: 'read', label: 'Read Paper', icon: '\u{1F4C4}', description: 'Extract full text from a paper by ID', color: 'from-emerald-600 to-teal-600' },
    { id: 'download', label: 'Download PDF', icon: '\u{1F4E5}', description: 'Download PDF of a paper by ID', color: 'from-violet-600 to-purple-600' },
]

const PAPER_SOURCES: { id: PaperSource; label: string; modesSupported: PaperMode[] }[] = [
    { id: 'arxiv', label: 'arXiv', modesSupported: ['search', 'read', 'download'] },
    { id: 'pubmed', label: 'PubMed', modesSupported: ['search', 'read', 'download'] },
    { id: 'semantic', label: 'Semantic Scholar', modesSupported: ['search', 'read', 'download'] },
    { id: 'biorxiv', label: 'bioRxiv', modesSupported: ['search', 'read', 'download'] },
    { id: 'medrxiv', label: 'medRxiv', modesSupported: ['search', 'read', 'download'] },
    { id: 'crossref', label: 'CrossRef', modesSupported: ['search', 'read', 'download'] },
    { id: 'google_scholar', label: 'Google Scholar', modesSupported: ['search'] },
    { id: 'iacr', label: 'IACR ePrint', modesSupported: ['search', 'read', 'download'] },
]

const PAPER_SEARCH_EXAMPLES = [
    'large language models',
    'CRISPR gene editing',
    'transformer architecture attention',
    'quantum error correction',
]

// Perplexity panel
export function PerplexityTab() {
    const [query, setQuery] = useState('')
    const [tool, setTool] = useState<PerplexityTool>('perplexity_ask')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/perplexity')

    const ask = () => {
        if (!query.trim()) return
        call({ query: query.trim(), tool })
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ask anything</label>
                    <textarea
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); reset() }}
                        placeholder="What would you like to know?"
                        rows={3}
                        className="w-full bg-muted/70 border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none"
                        disabled={loading}
                    />
                    <div className="flex flex-wrap gap-2">
                        {PERPLEXITY_EXAMPLE_QUERIES.map((q) => (
                            <button key={q} onClick={() => { setQuery(q); reset() }} className="text-xs text-muted-foreground hover:text-foreground bg-muted border border-border rounded-full px-3 py-1">{q.length > 52 ? q.slice(0, 51) + '\u2026' : q}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {PERPLEXITY_TOOLS.map((t) => (
                            <button key={t.id} onClick={() => { setTool(t.id); reset() }} disabled={loading} className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 ${tool === t.id ? `${t.color} ring-2 ring-white/30 scale-[1.02] shadow-lg` : 'from-muted to-muted/80 opacity-60 hover:opacity-90'}`}>
                                <div className="text-2xl mb-2">{t.icon}</div>
                                <div className="font-semibold text-sm">{t.label}</div>
                                <div className="text-xs opacity-80 mt-0.5">{t.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={ask} disabled={loading || !query.trim()} className={`w-full rounded-xl py-3.5 font-semibold text-sm ${PERPLEXITY_TOOLS.find((p) => p.id === tool)?.color ?? 'from-sky-600 to-blue-600'}`}> {loading ? 'Running...' : `${PERPLEXITY_TOOLS.find((p) => p.id === tool)?.icon} ${PERPLEXITY_TOOLS.find((p) => p.id === tool)?.label} with Perplexity`}</button>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-5 max-h-[34rem] overflow-y-auto">
                        <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    )
}

// Wikipedia panel
export function WikipediaTab() {
    const [tool, setTool] = useState<WikipediaTool>('search_wikipedia')
    const [input, setInput] = useState('')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/wikipedia')

    const run = () => {
        if (!input.trim()) return
        call({ query: input.trim(), tool })
    }

    const selected = WIKIPEDIA_TOOLS.find((t) => t.id === tool)!

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tool</label>
                    <div className="grid grid-cols-2 gap-3">
                        {WIKIPEDIA_TOOLS.map((t) => (
                            <button key={t.id} onClick={() => { setTool(t.id); reset() }} disabled={loading} className={`group rounded-xl p-3 ${tool === t.id ? `${t.color} text-white` : 'bg-muted'}`}>
                                <div className="font-semibold text-sm">{t.icon} {t.label}</div>
                                <div className="text-xs opacity-80">{t.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-foreground">{selected.argLabel}</label>
                    <input value={input} onChange={(e) => { setInput(e.target.value); reset() }} placeholder={selected.argPlaceholder} className="w-full bg-muted/70 border border-border rounded-xl px-4 py-2 text-sm" disabled={loading} />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {WIKIPEDIA_EXAMPLES.map((ex) => (
                            <button key={ex.label} onClick={() => { setInput(ex.value); reset() }} className="text-xs bg-muted border border-border rounded-full px-3 py-1">{ex.label}</button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={run} disabled={loading || !input.trim()} className="px-4 py-2 rounded-lg bg-primary text-white">Run</button>
                    <button onClick={reset} className="px-3 py-2 rounded-lg border">Clear</button>
                </div>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="p-4 bg-muted/30 rounded">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}

// Airbnb panel
export function AirbnbTab() {
    const [tool, setTool] = useState<AirbnbTool>('airbnb_search')
    const [location, setLocation] = useState('')
    const [listingId, setListingId] = useState('')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/airbnb')

    const isSearch = tool === 'airbnb_search'

    const run = () => {
        if (isSearch) {
            if (!location.trim()) return
            call({ tool, location: location.trim() })
        } else {
            if (!listingId.trim()) return
            call({ tool, id: listingId.trim() })
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                    <label className="text-sm font-medium text-foreground">Tool</label>
                    <div className="grid grid-cols-2 gap-3">
                        {AIRBNB_TOOLS.map((t) => (
                            <button key={t.id} onClick={() => { setTool(t.id); reset() }} disabled={loading} className={`group rounded-xl p-3 ${tool === t.id ? `${t.color} text-white` : 'bg-muted'}`}>
                                <div className="font-semibold text-sm">{t.icon} {t.label}</div>
                                <div className="text-xs opacity-80">{t.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {isSearch ? (
                    <div>
                        <label className="text-sm font-medium text-foreground">Location</label>
                        <input value={location} onChange={(e) => { setLocation(e.target.value); reset() }} placeholder="e.g. Paris, France" className="w-full bg-muted/70 border border-border rounded-xl px-4 py-2 text-sm" disabled={loading} />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {AIRBNB_LOCATION_EXAMPLES.map((loc) => (
                                <button key={loc} onClick={() => { setLocation(loc); reset() }} className="text-xs bg-muted border border-border rounded-full px-3 py-1">{loc}</button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="text-sm font-medium text-foreground">Listing ID</label>
                        <input value={listingId} onChange={(e) => { setListingId(e.target.value); reset() }} placeholder="e.g. 12345678" className="w-full bg-muted/70 border border-border rounded-xl px-4 py-2 text-sm" disabled={loading} />
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={run} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white">Run</button>
                    <button onClick={reset} className="px-3 py-2 rounded-lg border">Clear</button>
                </div>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="p-4 bg-muted/30 rounded">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}

// HackerNews panel
export function HackerNewsTab() {
    const [tool, setTool] = useState<HackerNewsTool>('search_stories')
    const [query, setQuery] = useState('')
    const [storyType, setStoryType] = useState('top')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/hackernews')

    const run = () => {
        if (tool === 'get_stories') {
            call({ tool, story_type: storyType })
        } else if (!query.trim()) return
        else call({ tool, query: query.trim() })
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                    <label className="text-sm font-medium text-foreground">Tool</label>
                    <div className="grid grid-cols-2 gap-3">
                        {HN_TOOLS.map((t) => (
                            <button key={t.id} onClick={() => { setTool(t.id); reset() }} disabled={loading} className={`group rounded-xl p-3 ${tool === t.id ? `${t.color} text-white` : 'bg-muted'}`}>
                                <div className="font-semibold text-sm">{t.icon} {t.label}</div>
                                <div className="text-xs opacity-80">{t.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {tool === 'get_stories' ? (
                    <div>
                        <label className="text-sm font-medium text-foreground">Story Type</label>
                        <div className="flex gap-2 mt-2">
                            {HN_STORY_TYPES.map((s) => (
                                <button key={s.id} onClick={() => setStoryType(s.id)} className={`text-xs px-3 py-1 rounded-full border ${storyType === s.id ? 'bg-primary text-white' : 'bg-muted'}`}>{s.label}</button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="text-sm font-medium text-foreground">Query / ID / Username</label>
                        <input value={query} onChange={(e) => { setQuery(e.target.value); reset() }} placeholder="e.g. TypeScript, 39827987, dang" className="w-full bg-muted/70 border border-border rounded-xl px-4 py-2 text-sm" disabled={loading} />
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={run} disabled={loading || (tool !== 'get_stories' && !query.trim())} className="px-4 py-2 rounded-lg bg-primary text-white">Run</button>
                    <button onClick={reset} className="px-3 py-2 rounded-lg border">Clear</button>
                </div>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="p-4 bg-muted/30 rounded">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}

// Paper search panel
export function PaperSearchTab() {
    const [mode, setMode] = useState<PaperMode>('search')
    const [source, setSource] = useState<PaperSource>('arxiv')
    const [query, setQuery] = useState('')
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall('/api/agent-market/paper-search')

    const run = () => {
        if (!query.trim()) return
        call({ mode, source, query: query.trim() })
    }

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div>
                    <label className="text-sm font-medium text-foreground">Mode</label>
                    <div className="flex gap-2 mt-2">
                        {PAPER_MODES.map((m) => (
                            <button key={m.id} onClick={() => setMode(m.id)} className={`text-xs px-3 py-1 rounded-full border ${mode === m.id ? 'bg-primary text-white' : 'bg-muted'}`}>{m.label}</button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-foreground">Source</label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {PAPER_SOURCES.map((s) => (
                            <button key={s.id} onClick={() => setSource(s.id)} className={`text-xs px-3 py-1 rounded-full border ${source === s.id ? 'bg-primary text-white' : 'bg-muted'}`}>{s.label}</button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-foreground">Query or ID</label>
                    <input value={query} onChange={(e) => { setQuery(e.target.value); reset() }} placeholder="e.g. transformer attention" className="w-full bg-muted/70 border border-border rounded-xl px-4 py-2 text-sm" disabled={loading} />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {PAPER_SEARCH_EXAMPLES.map((ex) => (
                            <button key={ex} onClick={() => { setQuery(ex); reset() }} className="text-xs bg-muted border border-border rounded-full px-3 py-1">{ex}</button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={run} disabled={loading || !query.trim()} className="px-4 py-2 rounded-lg bg-primary text-white">Run</button>
                    <button onClick={reset} className="px-3 py-2 rounded-lg border">Clear</button>
                </div>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="p-4 bg-muted/30 rounded">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}

export function GenericAgentPanel({ title, endpoint, example, placeholder, agentId }: { title: string; endpoint: string; example?: string; placeholder?: string; agentId?: string }) {
    const [input, setInput] = useState(example ?? '')
    const [tools, setTools] = useState<string[] | null>(null)
    const [selectedTool, setSelectedTool] = useState<string | null>(null)
    const { loading, statusMessages, result, error, call, reset } = useStreamingCall(endpoint)

    React.useEffect(() => {
        if (!agentId) return
        let mounted = true
        ;(async () => {
            try {
                const res = await fetch(`/api/agent-market/tools/${agentId}`)
                if (!res.ok) return
                const data = await res.json()
                if (mounted && data && Array.isArray(data.tools)) {
                    setTools(data.tools)
                }
            } catch {
                // ignore
            }
        })()
        return () => { mounted = false }
    }, [agentId])

    const run = () => {
        if (!input || !input.trim()) return
        const body: Record<string, unknown> = {}
        if (endpoint.includes('youtube')) body.url = input.trim()
        else if (endpoint.includes('airbnb')) {
            body.location = input.trim()
            body.tool = selectedTool ?? 'airbnb_search'
        } else if (endpoint.includes('perplexity')) {
            body.query = input.trim()
            if (selectedTool) body.tool = selectedTool
        } else if (endpoint.includes('hackernews')) {
            body.query = input.trim()
            if (selectedTool) body.tool = selectedTool
        } else if (endpoint.includes('paper-search')) {
            body.query = input.trim()
            if (selectedTool) body.mode = selectedTool
        } else if (endpoint.includes('wikipedia')) {
            body.query = input.trim()
            if (selectedTool) body.tool = selectedTool
        } else if (endpoint.includes('imagegen')) {
            body.prompt = input.trim()
            if (selectedTool) body.tool = selectedTool
        }
        call(body)
    }

    return (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="text-sm text-muted-foreground">{endpoint}</div>
            </div>

            {tools && tools.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {tools.map((t) => (
                        <button
                            key={t}
                            onClick={() => setSelectedTool(t)}
                            className={`text-xs px-3 py-1 rounded-full border ${selectedTool === t ? 'bg-primary text-white' : 'bg-muted'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder ?? 'Enter input'} className="flex-1 bg-muted/70 border border-border rounded-xl px-4 py-2.5 text-sm" disabled={loading} />
                <button onClick={run} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">Run</button>
                <button onClick={reset} className="px-3 py-2 rounded-lg border" disabled={loading}>Clear</button>
            </div>

            <StatusStream loading={loading} messages={statusMessages} />
            {error && <ErrorBox error={error} />}

            {result && !loading && (
                <div className="p-4 bg-muted/30 rounded">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}

export const AGENTS = [
    { id: 'youtube', title: 'YouTube', description: 'Extract transcripts & metadata from YouTube videos' },
    { id: 'perplexity', title: 'Perplexity', description: 'Web-grounded Q&A and research' },
    { id: 'airbnb', title: 'Airbnb', description: 'Search listings and fetch listing details' },
    { id: 'hackernews', title: 'Hacker News', description: 'Search and browse Hacker News stories' },
    { id: 'paper-search', title: 'Paper Search', description: 'Search and read academic papers' },
    { id: 'wikipedia', title: 'Wikipedia', description: 'Search and summarize Wikipedia articles' },
    { id: 'imagegen', title: 'ImageGen', description: 'Generate images from prompts' },
    
]

export const AgentPanels: Record<string, React.FC<Record<string, unknown>>> = {
    youtube: () => <YouTubeTab />,
    perplexity: () => <PerplexityTab />,
    airbnb: () => <AirbnbTab />,
    hackernews: () => <HackerNewsTab />,
    ['paper-search']: () => <PaperSearchTab />,
    wikipedia: () => <WikipediaTab />,
    imagegen: () => <GenericAgentPanel title="Image Gen" endpoint="/api/agent-market/imagegen" agentId="imagegen" example={undefined} placeholder="Image prompt" />,
    
}

export default null
