"use client";

import { useState } from "react";
import { Bell, Search, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Trigger data refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources..."
            className="h-9 w-64 rounded-md border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-400">
            /
          </kbd>
        </div>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="text-gray-500"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-gray-500">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* Provider Selector */}
        <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5">
          <div className="flex -space-x-1">
            <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center ring-2 ring-white">
              <span className="text-[8px] font-bold text-white">AWS</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-white">
              <span className="text-[8px] font-bold text-white">OCI</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white">
              <span className="text-[8px] font-bold text-white">D</span>
            </div>
          </div>
          <span className="text-sm text-gray-600">All Providers</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>

        {/* Custom Actions */}
        {actions}
      </div>
    </header>
  );
}
