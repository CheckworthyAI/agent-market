"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, TextField, InputGroup, Spinner } from '@heroui/react'
import { 
  SearchIcon,
  MCPIcon,
  MarketplaceIcon,
  ShieldIcon,
} from '@/components/dashboard/icons'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { createClient } from '@/utils/supabase/client'

const WrenchIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
)

interface MCP {
  id: string
  name: string
  url: string
  token: string
  description: string
  created_at: string
}

export default function AgentMarketPage() {
    const [mcps, setMcps] = useState<MCP[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function fetchMCPs() {
            setLoading(true)
            const { data, error } = await supabase
                .from('adk_mcps')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (data) {
                setMcps(data)
            }
            setLoading(false)
        }
        fetchMCPs()
    }, [supabase])

    const filteredMcps = mcps.filter(mcp => 
        mcp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mcp.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleConnect = (mcp: MCP) => {
        const params = new URLSearchParams()
        params.set('url', mcp.url)
        if (mcp.token) params.set('token', mcp.token)
        router.push(`/dashboard/mcp-inspection?${params.toString()}`)
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-default-900 tracking-tight">MCP Market</h1>
                        <p className="text-default-500 text-sm font-medium">Discover and connect to Model Context Protocol servers</p>
                    </div>
                    <div className="w-full md:w-96">
                        <TextField aria-label="Search MCPs">
                            <InputGroup className="h-11 rounded-xl border border-divider bg-default-100/50 hover:bg-default-200/50 transition-all shadow-none">
                                <InputGroup.Prefix className="pl-3">
                                    <SearchIcon size={18} className="text-default-400" />
                                </InputGroup.Prefix>
                                <InputGroup.Input 
                                    placeholder="Search MCPs..." 
                                    className="text-sm"
                                    value={searchQuery}
                                    onChange={(e: any) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </TextField>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <Card key={i} className="h-[280px] border-none bg-default-50/50 flex items-center justify-center">
                                <Spinner color="current" size="lg" />
                            </Card>
                        ))
                    ) : (
                        filteredMcps.map((mcp) => (
                            <Card 
                                key={mcp.id} 
                                className="border border-transparent bg-default-50/40 hover:bg-default-100/60 hover:border-default-200 transition-all duration-300 group flex flex-col"
                            >
                                {/* card header area */}
                                <div className="flex justify-between items-start pt-5 px-5 mb-3">
                                    <div className="flex gap-4">
                                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300 shadow-sm shadow-primary/5">
                                            <WrenchIcon size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <p className="text-lg font-bold text-default-900 leading-none">{mcp.name}</p>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse"></div>
                                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* card body area */}
                                <div className="px-5 pb-5 space-y-4 flex-grow flex flex-col">
                                    <p className="text-sm text-default-500 leading-relaxed line-clamp-2 min-h-[40px] text-left">
                                        {mcp.description || "A Model Context Protocol server providing specialized tools and resources for your agents."}
                                    </p>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-default-100/50 border border-default-200/50 rounded-xl px-4 py-2 overflow-hidden transition-colors group-hover:border-default-300">
                                            <p className="text-[11px] text-default-400 truncate font-mono tracking-tight">{mcp.url}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1 mt-auto">
                                        <Button 
                                            className="flex-1 bg-default-900 text-white font-bold h-10 shadow-lg shadow-default-200/20 group/btn hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                            onClick={() => handleConnect(mcp)}
                                        >
                                            Connect
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
                
                {!loading && filteredMcps.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                        <div className="p-6 rounded-3xl bg-default-100/50 border border-default-200/50">
                            <SearchIcon size={48} className="text-default-300" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold text-default-900">No servers found</p>
                            <p className="text-default-500 max-w-xs mx-auto text-sm">We couldn't find any MCP servers matching "{searchQuery}". Try another search term.</p>
                        </div>
                        <Button variant="secondary" onClick={() => setSearchQuery('')} className="font-semibold">
                            Clear search
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
