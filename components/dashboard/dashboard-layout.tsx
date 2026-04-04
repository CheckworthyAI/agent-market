"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { SidebarWrapper } from "./sidebar/sidebar";
import { TopNavBar } from "./navbar/navbar";
import { SidebarContext } from "./layout-context";

const STORAGE_KEY = "dashboard-sidebar-open";

interface Props {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: Props) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [isMdUp, setIsMdUp] = useState(true);

  useEffect(() => {
    setHydrated(true);
    const mq = window.matchMedia("(min-width: 768px)");
    const syncMq = () => setIsMdUp(mq.matches);
    syncMq();
    mq.addEventListener("change", syncMq);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    }
    return () => mq.removeEventListener("change", syncMq);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !hydrated) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const applyScrollLock = () => {
      if (mq.matches && sidebarOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };
    applyScrollLock();
    mq.addEventListener("change", applyScrollLock);
    return () => {
      mq.removeEventListener("change", applyScrollLock);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen, hydrated]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches
      ) {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        isMdUp,
        toggleSidebar,
        closeSidebar,
      }}
    >
      <section className="flex h-screen w-full flex-row overflow-hidden bg-[var(--sidebar-bg)]">
        <SidebarWrapper />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l border-divider bg-background shadow-[-4px_0_15px_-3px_oklch(0%_0_0_/0.02)]">
          <TopNavBar />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </section>
    </SidebarContext.Provider>
  );
};
