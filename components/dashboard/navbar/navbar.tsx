"use client";

import { TextField, InputGroup } from "@heroui/react";
import NextLink from "next/link";
import React from "react";
import { SearchIcon } from "../icons";
import { BrandMark } from "../brand-mark";
import { useSidebarContext } from "../layout-context";
import { BurguerButton } from "./burguer-button";
import { NotificationsDropdown } from "./notifications-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

/** Full-width top bar (reference: navbar above sidebar + main). */
export function TopNavBar() {
  const { sidebarOpen, isMdUp } = useSidebarContext();
  const mobileDrawerOpen = !isMdUp && sidebarOpen;

  return (
    <nav className="sticky top-0 z-50 grid h-16 w-full shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)_minmax(0,1fr)] items-center gap-2 border-b border-divider bg-[var(--surface)]/95 px-4 backdrop-blur-md md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center justify-self-start gap-2 md:gap-3">
        {!isMdUp && !sidebarOpen ? <BurguerButton variant="navbar" /> : null}
        {!sidebarOpen && (
          <NextLink
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="shrink-0 rounded-md bg-[var(--logo-mark-bg)] p-1 shadow-sm md:p-1.5">
              <BrandMark size={20} />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-foreground">
              Agent Market
            </span>
          </NextLink>
        )}
      </div>

      <div className="mx-auto w-full min-w-0 max-w-xl justify-self-center px-1">
        <TextField aria-label="Search" type="search" className="w-full">
          <InputGroup className="min-h-10 rounded-full border border-divider bg-[var(--surface-secondary)] shadow-none transition-colors has-[input:focus-visible]:border-focus">
            <InputGroup.Prefix className="pl-3">
              <SearchIcon className="text-muted-foreground" size={18} />
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder="Search agents, docs..."
              className="text-sm"
            />
          </InputGroup>
        </TextField>
      </div>

      <div className="flex items-center justify-end justify-self-end gap-2 md:gap-4">
        <ThemeSwitch />
        <NotificationsDropdown />
      </div>
    </nav>
  );
}
