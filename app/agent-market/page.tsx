"use client"

import Link from 'next/link'
import React from 'react'
import { AGENTS } from './ui'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

export default function AgentMarketPage() {
    return (
        <DashboardLayout>
            <main className="max-w-6xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Agent Market</h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {AGENTS.map((a) => (
                        <div key={a.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{a.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={`/agent-market/${a.id}`} className="px-4 py-2 rounded-lg bg-primary text-white">Explore</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </DashboardLayout>
    )
}
