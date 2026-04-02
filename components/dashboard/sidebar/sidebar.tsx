"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Sidebar } from "./sidebar.styles";
import { Dropdown, Separator } from "@heroui/react";
import { BurguerButton } from "../navbar/burguer-button";
import { BrandMark } from "../brand-mark";
import {
  AgentsIcon,
  MarketplaceIcon,
  ShieldIcon,
  InspectIcon,
  MCPIcon,
  AgentAimIcon,
  SettingsIcon,
  BillingIcon,
} from "../icons";
import { SidebarItem } from "./sidebar-item";
import { SidebarMenu } from "./sidebar-menu";
import { useSidebarContext } from "../layout-context";
import { usePathname, useRouter } from "next/navigation";
import NextLink from "next/link";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitials(name: string, email: string): string {
  const n = name.trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return "U";
}

export const SidebarWrapper = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, closeSidebar, isMdUp } = useSidebarContext();
  const isRail = isMdUp && !sidebarOpen;
  const mobileDrawerOpen = !isMdUp && sidebarOpen;
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
    };
    void load();
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase]);

  const meta = user?.user_metadata as Record<string, string> | undefined;
  const displayName =
    meta?.full_name ||
    meta?.name ||
    user?.email?.split("@")[0] ||
    "Account";
  const initials = getInitials(displayName, user?.email ?? "");
  const avatarUrl = meta?.avatar_url as string | undefined;
  const planRaw =
    (meta?.plan as string | undefined) ??
    (meta?.subscription_tier as string | undefined) ??
    "Free";
  const planLabel = planRaw
    ? `${planRaw.charAt(0).toUpperCase()}${planRaw.slice(1)}`
    : "Free";

  const closeMobileSidebar = () => {
    if (!isMdUp) closeSidebar();
  };

  return (
    <>
      <div
        className={Sidebar.Overlay({ visible: mobileDrawerOpen })}
        onClick={closeSidebar}
        aria-hidden={!mobileDrawerOpen}
      />
      <div className={Sidebar({ expanded: sidebarOpen })}>
        <div
          className={clsx(
            "grid min-h-0 shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]",
            !isMdUp &&
              "fixed left-0 top-16 z-[203] h-[calc(100vh-4rem)] w-64 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            !isMdUp &&
              (sidebarOpen
                ? "translate-x-0 px-2 pb-2 pt-3"
                : "pointer-events-none -translate-x-full px-2 pb-2 pt-3"),
            isMdUp &&
              "relative z-auto h-full min-h-0 w-full max-w-full translate-x-0 px-2 pb-2 pt-3",
            isMdUp && isRail && "justify-items-stretch",
            isMdUp && !isRail && "w-64",
          )}
        >
          <div className={Sidebar.Header({ rail: isRail })}>
            {!isRail ? (
              <>
                <NextLink
                  href="/"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pr-1 no-underline transition-colors hover:bg-[var(--sidebar-item-hover)]"
                >
                  <div className="shrink-0 rounded-md bg-[var(--logo-mark-bg)] p-1.5">
                    <BrandMark size={22} />
                  </div>
                  <span className="truncate text-[15px] font-semibold tracking-tight text-default-900">
                    Agent Market
                  </span>
                </NextLink>
                <BurguerButton variant="rail" />
              </>
            ) : (
              <BurguerButton variant="rail" />
            )}
          </div>

          <div className={Sidebar.Body({ rail: isRail })}>
            <SidebarItem
              title="Agent Aim"
              icon={<AgentAimIcon />}
              isActive={pathname === "/dashboard/agent-aim"}
              href="/dashboard/agent-aim"
            />
            {/* <SidebarItem
              title="Workspace"
              icon={<HomeIcon />}
              isActive={pathname === "/dashboard/overview"}
              href="/dashboard/overview"
            /> */}
            <SidebarMenu title="Explore" hideLabel={isRail}>
              <SidebarItem
                isActive={pathname === "/dashboard/agents"}
                title="My Agents"
                icon={<AgentsIcon />}
                href="/dashboard/agents"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/marketplace"}
                title="Agent MarketPlace"
                icon={<MarketplaceIcon />}
                href="/dashboard/marketplace"
              />
              <SidebarItem
                isActive={pathname === "/agent-market"}
                title="MCP Market"
                icon={<MCPIcon />}
                href="/agent-market"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/mcp-inspection"}
                title="MCP Inspector"
                icon={<InspectIcon />}
                href="/dashboard/mcp-inspection"
              />
              <SidebarItem
                isActive={pathname === "/dashboard/mcp-scanner"}
                title="MCP Scanner"
                icon={<ShieldIcon />}
                href="/dashboard/mcp-scanner"
              />
            </SidebarMenu>
          </div>

          <div className={Sidebar.Footer({ rail: isRail })}>
              <Dropdown>
                <Dropdown.Trigger
                  aria-label="Account menu"
                  className={clsx(
                    "flex outline-none transition-[background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-focus",
                    isRail
                      ? "size-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 hover:bg-[var(--sidebar-item-hover)]"
                      : "w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--sidebar-profile-chip)] px-2.5 py-2.5 text-left shadow-[0_1px_2px_oklch(0%_0_0_/0.04)] hover:bg-[var(--sidebar-profile-chip-hover)] dark:border-white/[0.08]",
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={clsx(
                        "flex shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-user-avatar-bg)] font-semibold text-[var(--sidebar-user-avatar-fg)]",
                        isRail ? "size-9 text-xs" : "size-9 text-[12px]",
                      )}
                    >
                      {initials}
                    </div>
                  )}
                  {!isRail && (
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold leading-tight text-default-900">
                        {displayName}
                      </p>
                      <p className="mt-0.5 truncate text-xs leading-tight text-default-500">
                        {planLabel}
                      </p>
                    </div>
                  )}
                </Dropdown.Trigger>
                <Dropdown.Popover
                  placement="top start"
                  offset={8}
                  className="rounded-2xl border border-divider bg-overlay p-0 shadow-[var(--overlay-shadow)]"
                >
                  <Dropdown.Menu
                    aria-label="Account"
                    className="min-w-[220px] gap-0 rounded-2xl p-1.5"
                  >
                    <Dropdown.Item
                      key="view-profile"
                      className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-default"
                      onPress={() => {
                        router.push("/dashboard/settings");
                        closeMobileSidebar();
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <UserCircleIcon className="shrink-0 text-default-600" />
                        <span className="text-sm font-medium text-default-900">
                          View Profile
                        </span>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      key="settings"
                      className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-default"
                      onPress={() => {
                        router.push("/dashboard/settings");
                        closeMobileSidebar();
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <SettingsIcon
                          size={18}
                          className="shrink-0 text-default-600"
                        />
                        <span className="text-sm font-medium text-default-900">
                          My Settings
                        </span>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      key="billing"
                      className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-default"
                      onPress={() => {
                        router.push("/dashboard/billing");
                        closeMobileSidebar();
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <BillingIcon
                          size={18}
                          className="shrink-0 text-default-600"
                        />
                        <span className="text-sm font-medium text-default-900">
                          Billing Info
                        </span>
                      </span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      key="help"
                      className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 data-[hovered=true]:bg-default"
                      onPress={() => {
                        router.push("/help-feedback");
                        closeMobileSidebar();
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <HelpCircleIcon className="shrink-0 text-default-600" />
                        <span className="text-sm font-medium text-default-900">
                          Help &amp; Feedback
                        </span>
                      </span>
                    </Dropdown.Item>
                    <Separator className="my-1 h-px bg-divider" />
                    <Dropdown.Item
                      key="logout"
                      className="cursor-pointer rounded-xl py-2.5 pl-2 pr-3 text-danger data-[hovered=true]:bg-danger/10"
                      onPress={handleLogout}
                    >
                      <span className="flex items-center gap-3">
                        <LogOutIcon className="shrink-0 text-danger" />
                        <span className="text-sm font-medium">Sign out</span>
                      </span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
          </div>
        </div>
      </div>
    </>
  );
};
