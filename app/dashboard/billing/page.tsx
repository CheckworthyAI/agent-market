"use client";

import { Card, Button, Chip } from "@heroui/react";
import React from "react";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-16 max-w-5xl mx-auto w-full mb-8">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-3xl font-bold text-default-900 tracking-tight">Billing & Plans</h1>
      </div>

      {/* Current Plan Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-default-900">Current plan</h2>
        
        <Card className="bg-surface border border-divider shadow-sm !rounded-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Top Left: Plan */}
            <div className="p-6 md:border-r border-b border-divider flex flex-col justify-start shadow-none">
              <span className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-3">Plan</span>
              <h3 className="text-2xl font-bold text-default-900 mb-2">Pro</h3>
              <div className="mt-auto pt-3">
                <a href="#" className="text-[13px] font-medium text-primary hover:underline transition-all">Upgrade to Business</a>
              </div>
            </div>

            {/* Top Right: Billing Cycle */}
            <div className="p-6 border-b border-divider flex flex-col justify-start">
              <span className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-3">Billing Cycle</span>
              <h3 className="text-2xl font-bold text-default-900 mb-2">Monthly</h3>
              <div className="mt-auto flex items-center gap-3 pt-3">
                <a href="#" className="text-[13px] font-medium text-primary hover:underline transition-all">Switch to annual plan</a>
                <span className="bg-success/15 text-success font-semibold px-2 py-0.5 text-[10px] rounded uppercase tracking-wide">
                  Save $144 per year
                </span>
              </div>
            </div>

            {/* Bottom Left: Billing Date */}
            <div className="p-6 md:border-r border-b md:border-b-0 border-divider flex flex-col justify-start">
              <span className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-3">Billing Date</span>
              <div className="flex items-center gap-6 mt-1 flex-wrap">
                <div className="flex flex-col gap-1">
                   <span className="text-[13px] text-default-500 font-medium">Last billing</span>
                   <span className="text-[17px] font-bold text-default-900">Apr 4, 2024</span>
                </div>
                <div className="flex items-center hidden sm:flex px-1 mt-6">
                   <div className="size-1 rounded-full bg-default-300"></div>
                   <div className="h-px bg-default-300 w-8"></div>
                   <div className="size-1 rounded-full bg-default-300"></div>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[13px] text-default-500 font-medium">Next billing</span>
                   <span className="text-[17px] font-bold text-default-900">May 4, 2024</span>
                </div>
              </div>
            </div>

            {/* Bottom Right: Licenses */}
            <div className="p-6 flex flex-col justify-start">
              <span className="text-[11px] font-semibold text-default-400 uppercase tracking-widest mb-3">Licenses</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[17px] font-bold text-default-900">4/5</span>
                <span className="text-[13px] text-default-500 font-medium">allocated</span>
              </div>
              <div className="mt-auto pt-5">
                <a href="#" className="text-[13px] font-medium text-primary hover:underline transition-all">Manage licenses</a>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Billing Details Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex flex-col gap-1">
             <h2 className="text-lg font-bold text-default-900">Billing details</h2>
             <p className="text-[13.5px] text-default-500">AgentMarket integrates with Stripe for safe and secure billing.</p>
           </div>
           <Button variant="secondary" className="flex items-center gap-1 font-semibold text-primary text-[13px] bg-primary/5 hover:bg-primary/10 border-none shrink-0">
             Manage billing in Stripe
             <svg className="size-[14px] ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
           </Button>
        </div>

        <div className="flex flex-col py-1">
           <div className="grid grid-cols-1 md:grid-cols-12 py-3 items-center gap-2 md:gap-0">
             <span className="md:col-span-3 text-[11px] font-semibold text-default-400 uppercase tracking-widest">Payment Method</span>
             <div className="md:col-span-9 flex flex-wrap items-center gap-6 text-[14px] text-default-900">
                <div className="flex items-center gap-2.5">
                   <div className="bg-white rounded px-1.5 py-0.5 border border-black/10 dark:border-white/10 shrink-0 shadow-sm flex items-center justify-center">
                     <svg viewBox="0 0 24 16" className="h-[14px] w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9.5" cy="8" r="5.5" fill="#EA001B"/>
                        <circle cx="15.5" cy="8" r="5.5" fill="#F7A01D" fillOpacity="0.8"/>
                     </svg>
                   </div>
                   <span className="font-medium">Mastercard <span className="tracking-widest opacity-80 pl-0.5">••••</span> 2461</span>
                </div>
                <span className="text-default-500 font-medium text-[13.5px]">Expires 02/2028</span>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 py-3 items-center gap-2 md:gap-0 mt-2 md:mt-0">
             <span className="md:col-span-3 text-[11px] font-semibold text-default-400 uppercase tracking-widest">Billing Contact</span>
             <div className="md:col-span-9 text-[14px] font-medium text-default-900">
                tech@agentmarket.ai
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 py-3 items-center gap-2 md:gap-0 mt-2 md:mt-0">
             <span className="md:col-span-3 text-[11px] font-semibold text-default-400 uppercase tracking-widest">Invoice History</span>
             <div className="md:col-span-9">
                <a href="#" className="text-[13px] font-medium text-primary hover:underline transition-all">View in Stripe</a>
             </div>
           </div>
        </div>
      </div>

      {/* Cancel Subscription Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex flex-col gap-1">
             <h2 className="text-lg font-bold text-default-900">Cancel subscription</h2>
             <p className="text-[13.5px] text-default-500">Canceled subscription will remain active until the end of the current billing period.</p>
           </div>
           <Button variant="danger-soft" className="font-semibold px-5 text-[13px] shrink-0">
             Cancel subscription
           </Button>
        </div>
      </div>
    </div>
  );
}
