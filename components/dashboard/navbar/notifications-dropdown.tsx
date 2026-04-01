"use client";

import {
  Dropdown,
} from "@heroui/react";
import React from "react";
import { NotificationsIcon } from "../icons";

export const NotificationsDropdown = () => {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button className="cursor-pointer p-2 rounded-full hover:bg-default-100 transition-colors flex items-center justify-center">
          <NotificationsIcon className="text-default-500" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu className="w-80" aria-label="Notifications">
            <Dropdown.Item
              className="py-2"
              key="1"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">📣 Task Completed</p>
                <p className="text-xs text-default-500">Your recent agent 'Data Miner' completed its task successfully.</p>
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              key="2"
              className="py-2"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">🚀 Platform Update</p>
                <p className="text-xs text-default-500">AgentMarket v2.0 is now live with enhanced analytics tools.</p>
              </div>
            </Dropdown.Item>
            <Dropdown.Item
              key="3"
              className="py-2"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium text-sm">💳 Billing Success</p>
                <p className="text-xs text-default-500">Your monthly subscription was renewed successfully.</p>
              </div>
            </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
