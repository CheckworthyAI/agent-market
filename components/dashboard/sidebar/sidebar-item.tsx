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
  const { setCollapsed } = useSidebarContext();

  const handleClick = () => {
    if (window.innerWidth < 768) {
      setCollapsed();
    }
  };
  
  return (
    <NextLink
      href={href}
      className="text-default-900 active:bg-none max-w-full no-underline"
    >
      <div
        className={clsx(
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-default-100 text-default-500",
          "flex gap-2 w-full min-h-[44px] h-full items-center px-3.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]"
        )}
        onClick={handleClick}
      >
        {icon}
        <span className={clsx(isActive ? "text-primary" : "text-default-900", "font-medium")}>{title}</span>
      </div>
    </NextLink>
  );
};
