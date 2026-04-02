import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { useSidebarContext } from "../layout-context";
import { usePathname } from "next/navigation";

interface Props {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SidebarCollapse = ({
  icon,
  title,
  children,
  defaultOpen = false,
}: Props) => {
  const { sidebarOpen, isMdUp } = useSidebarContext();
  const pathname = usePathname();
  const compact = isMdUp && !sidebarOpen;
  
  // Check if any child is active to auto-expand
  const hasActiveChild = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      return (child.props as any).isActive === true;
    }
    return false;
  });

  const [isOpen, setIsOpen] = useState(defaultOpen || hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  if (compact) {
    // In compact mode, maybe just show the icon or a tooltip?
    // For now, let's just show the icon.
    return (
      <div className="flex w-full justify-center px-0.5 py-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-default-600 hover:bg-[var(--sidebar-item-hover)] transition-colors">
          <span className="flex items-center justify-center [&_svg]:size-6">
            {icon}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-2.5 py-2.5 transition-all duration-150 outline-none select-none",
          isOpen ? "text-default-900" : "text-default-600 hover:bg-[var(--sidebar-item-hover)]"
        )}
      >
        <span className="flex shrink-0 items-center justify-center [&_svg]:size-6 text-default-500">
          {icon}
        </span>
        <span className="flex-1 text-left font-medium text-sm">
          {title}
        </span>
        <ChevronDownIcon 
          className={clsx(
            "transition-transform duration-200 text-default-400 size-4",
            isOpen ? "rotate-0" : "rotate-[-90deg]"
          )}
        />
      </button>

      <div
        className={clsx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pl-6 mt-0.5 relative ml-6">
            <div className="absolute left-0 top-0 bottom-3 w-px bg-default-100" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
