import NextLink from "next/link";
import React from "react";
import { useSidebarContext } from "../layout-context";
import clsx from "clsx";

interface Props {
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
  href?: string;
}

export const SidebarItem = ({ icon, title, isActive, href = "" }: Props) => {
  const { closeSidebar, sidebarOpen, isMdUp } = useSidebarContext();
  const compact = isMdUp && !sidebarOpen;

  const handleClick = () => {
    if (!isMdUp) {
      closeSidebar();
    }
  };

  return (
    <NextLink
      href={href}
      title={compact ? title : undefined}
      className={clsx(
        "text-default-900 no-underline active:bg-none",
        compact ? "flex w-full justify-center px-0.5" : "max-w-full",
      )}
    >
      <div
        className={clsx(
          isActive
            ? "bg-[var(--sidebar-item-active)] text-[var(--sidebar-fg-active)]"
            : "text-default-600 hover:bg-[var(--sidebar-item-hover)]",
          compact
            ? "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors duration-150"
            : "flex min-h-11 w-full cursor-pointer items-center gap-3.5 rounded-xl px-2.5 py-2.5 transition-colors duration-150",
        )}
        onClick={handleClick}
      >
        <span
          className={clsx(
            "flex shrink-0 items-center justify-center [&_svg]:size-6",
            isActive
              ? "text-[var(--sidebar-fg-active)]"
              : "text-default-500 [&_path]:opacity-95",
          )}
        >
          {icon}
        </span>
        {!compact && (
          <span
            className={clsx(
              isActive
                ? "text-[var(--sidebar-fg-active)]"
                : "text-default-900",
              "font-medium",
            )}
          >
            {title}
          </span>
        )}
      </div>
    </NextLink>
  );
};
