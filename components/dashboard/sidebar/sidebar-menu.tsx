import React from "react";

interface Props {
  title: string;
  children?: React.ReactNode;
}

export const SidebarMenu = ({ title, children }: Props) => {
  return (
    <div className="flex flex-col gap-1.5 mt-4 first:mt-0">
      <span className="text-[10px] uppercase font-semibold text-foreground-400 px-3 tracking-wider">{title}</span>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
};
