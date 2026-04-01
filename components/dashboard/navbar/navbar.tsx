"use client";

import { TextField, InputGroup } from "@heroui/react";
import React from "react";
import { SearchIcon } from "../icons";
import { BurguerButton } from "./burguer-button";
import { NotificationsDropdown } from "./notifications-dropdown";
import { UserDropdown } from "./user-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

interface Props {
  children: React.ReactNode;
}

export const NavbarWrapper = ({ children }: Props) => {
  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-2">
      <nav className="sticky top-0 z-40 w-full border-b border-divider bg-background/70 backdrop-blur-md h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <BurguerButton />
          </div>
          <div className="max-md:hidden w-full max-w-[400px]">
            <TextField aria-label="Search" type="search">
              <InputGroup>
                <InputGroup.Prefix>
                   <SearchIcon className="text-muted" size={18} />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Search agents, docs..." />
              </InputGroup>
            </TextField>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeSwitch />
          <NotificationsDropdown />
          <UserDropdown />
        </div>
      </nav>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
