"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Server,
  Container,
  Globe,
  Key,
  DollarSign,
  Rocket,
  Activity,
  Settings,
  Users,
  LayoutDashboard,
  Wrench,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Compute", href: "/compute", icon: Server },
  { name: "Containers", href: "/containers", icon: Container },
  { name: "DNS", href: "/dns", icon: Globe },
  { name: "Secrets", href: "/secrets", icon: Key },
  { name: "Deployments", href: "/deployments", icon: Rocket },
  { name: "Costs", href: "/costs", icon: DollarSign },
  { name: "Builds", href: "/builds", icon: Wrench },
];

const secondaryNavigation = [
  { name: "Agents", href: "/agents", icon: Radio },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Server className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">AEIMS</span>
          <span className="text-[10px] text-gray-400 -mt-1">
            Infrastructure Management
          </span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Resources
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-6 mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Management
        </div>
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">AD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              After Dark Systems
            </p>
            <p className="text-xs text-gray-400 truncate">Enterprise</p>
          </div>
        </div>
      </div>
    </div>
  );
}
