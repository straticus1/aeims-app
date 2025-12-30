"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  iconColor?: string;
  breakdown?: {
    label: string;
    value: number;
    color: string;
  }[];
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "bg-indigo-100 text-indigo-600",
  breakdown,
}: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={cn("rounded-lg p-3", iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              change.type === "increase" ? "text-green-600" : "text-red-600"
            )}
          >
            {change.type === "increase" ? "+" : "-"}
            {Math.abs(change.value)}%
          </span>
          <span className="text-sm text-gray-500">from last month</span>
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
            {breakdown.map((item, index) => (
              <div
                key={index}
                className={cn("h-full", item.color)}
                style={{
                  width: `${
                    (item.value /
                      breakdown.reduce((acc, i) => acc + i.value, 0)) *
                    100
                  }%`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", item.color)} />
                <span className="text-xs text-gray-500">
                  {item.label}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
