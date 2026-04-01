"use client";

import React from "react";
import { useTheme as useNextTheme } from "next-themes";
import { Switch } from "@heroui/react";

export const DarkModeSwitch = () => {
  const { setTheme, resolvedTheme } = useNextTheme();
  return (
    <Switch
      isSelected={resolvedTheme === "dark"}
      onChange={(value: boolean) => setTheme(value ? "dark" : "light")}
      size="sm"
    />
  );
};
