"use client"

import React from 'react'
import Link from 'next/link'
import { AgentPanels, AGENTS } from '../ui'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

interface Props { params: { agent: string } }

export default function AgentDetailPage({ params }: Props) {
    const { agent } = params

    const panel = (AgentPanels as any)[agent]
    if (!panel) {
        return (
            <DashboardLayout>
                <main className="max-w-4xl mx-auto p-6">
                    <h1 className="text-2xl font-bold">Agent not found</h1>
                    <p className="mt-3 text-sm text-muted-foreground">The agent "{agent}" is not available. Available agents: {AGENTS.map(a=>a.id).join(', ')}</p>
                </main>
            </DashboardLayout>
        )
    }

    const Panel = panel as React.FC

    return (
        <DashboardLayout>
            <main className="max-w-4xl mx-auto p-6">
                <div className="mb-4">
                    <Link href="/agent-market" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-muted text-muted-foreground hover:opacity-90">
                        ← Back
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-4">{agent}</h1>
                <Panel />
            </main>
        </DashboardLayout>
    )
}
