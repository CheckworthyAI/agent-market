"use client";

import {
  Avatar,
  Dropdown,
} from "@heroui/react";
import React, { useCallback, useEffect, useState } from "react";
import { DarkModeSwitch } from "./dark-mode-switch";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export const UserDropdown = () => {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase]);

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button className="transition-transform cursor-pointer outline-none">
          <Avatar
            color="accent"
            size="md"
          >
            <Avatar.Image src={user?.user_metadata?.avatar_url || "https://i.pravatar.cc/150?u=agent-market-user"} />
            <Avatar.Fallback>{user?.email?.charAt(0).toUpperCase() || "U"}</Avatar.Fallback>
          </Avatar>
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          className="w-80"
          aria-label="User menu actions"
          onAction={(actionKey) => console.log({ actionKey })}
        >
          <Dropdown.Item
            key="profile"
            className="flex flex-col justify-start w-full items-start h-auto"
          >
            <p className="text-xs text-default-500">Signed in as</p>
            <p className="font-semibold text-default-900">{user?.email || "User"}</p>
          </Dropdown.Item>
          <Dropdown.Item key="settings">My Settings</Dropdown.Item>
          <Dropdown.Item key="billing">Billing Info</Dropdown.Item>
          <Dropdown.Item key="help_and_feedback">Help & Feedback</Dropdown.Item>
          <Dropdown.Item
            key="logout"
            className="text-danger"
            onPress={handleLogout}
          >
            Log Out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
