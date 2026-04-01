"use client";

import React from "react";
import { Sidebar } from "./sidebar.styles";
import { Avatar, Tooltip } from "@heroui/react";
import { 
  HomeIcon, 
  AgentsIcon, 
  MarketplaceIcon, 
  BillingIcon, 
  SettingsIcon
} from "../icons";
import { SidebarItem } from "./sidebar-item";
import { SidebarMenu } from "./sidebar-menu";
import { useSidebarContext } from "../layout-context";
import { usePathname } from "next/navigation";
import NextLink from "next/link";

export const SidebarWrapper = () => {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarContext();

  return (
    <aside className="h-screen z-[202] sticky top-0">
      {collapsed ? (
        <div className={Sidebar.Overlay()} onClick={setCollapsed} />
      ) : null}
      <div
        className={Sidebar({
          collapsed: collapsed,
        })}
      >
        <div className={Sidebar.Header()}>
          <NextLink href="/" className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                 <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-default-900 tracking-tight">
              AgentMarket
            </h3>
          </NextLink>
        </div>
        
        <div className="flex flex-col justify-between h-full">
          <div className={Sidebar.Body()}>
            <SidebarItem
              title="Overview"
              icon={<HomeIcon />}
              isActive={pathname === "/dashboard"}
              href="/dashboard"
            />
            
            <SidebarMenu title="Main Menu">
              <SidebarItem
                isActive={pathname === "/dashboard/agents"}
                title="My Agents"
                icon={<AgentsIcon />}
                href="/dashboard/agents"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/marketplace"}
                title="Marketplace"
                icon={<MarketplaceIcon />}
                href="/dashboard/marketplace"
              />
              <SidebarItem
                isActive={pathname === "/agent-market"}
                title="Agent Market"
                icon={<MarketplaceIcon />}
                href="/agent-market"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/mcp-inspection"}
                title="MCP Inspector"
                icon={<MarketplaceIcon />}
                href="/dashboard/mcp-inspection"
              />
            </SidebarMenu>

            <SidebarMenu title="General">
              <SidebarItem
                isActive={pathname === "/dashboard/billing"}
                title="Billing"
                icon={<BillingIcon />}
                href="/dashboard/billing"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/settings"}
                title="Settings"
                icon={<SettingsIcon />}
                href="/dashboard/settings"
              />
            </SidebarMenu>
          </div>
          
          <div className={Sidebar.Footer()}>
             <div className="flex items-center gap-3">
               <Tooltip>
                 <Tooltip.Trigger>
                    <button className="outline-none">
                      <Avatar
                        color="accent"
                        size="sm"
                      >
                        <Avatar.Image src="https://i.pravatar.cc/150?u=agent-market-user" />
                        <Avatar.Fallback>U</Avatar.Fallback>
                      </Avatar>
                    </button>
                 </Tooltip.Trigger>
                 <Tooltip.Content className="px-2 py-1 text-xs">
                   Profile
                 </Tooltip.Content>
               </Tooltip>
               <div className="flex flex-col gap-0">
                  <span className="text-xs font-semibold text-default-900">User Email</span>
                  <span className="text-[10px] text-default-500 font-medium">Free Plan</span>
               </div>
             </div>
             <NextLink href="/dashboard/settings">
               <SettingsIcon className="text-default-400 hover:text-primary transition-colors cursor-pointer" size={20} />
             </NextLink>
          </div>
        </div>
      </div>
    </aside>
  );
};
