"use client";

import { Server, Container, Globe, Key, DollarSign, Activity, Radio, AlertTriangle } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";

// Mock data - replace with real API calls
const mockStats = {
  compute: {
    total: 12,
    running: 8,
    stopped: 4,
    byProvider: { aws: 5, oci: 4, docker: 3 },
  },
  containers: {
    total: 47,
    running: 42,
    byProvider: { docker: 35, aws: 12 },
  },
  dns: {
    zones: 8,
    records: 156,
    byProvider: { aws: 4, oci: 2, cloudflare: 2 },
  },
  agents: {
    total: 5,
    online: 4,
    offline: 1,
  },
  costs: {
    mtd: 847.32,
    projected: 1250.00,
  },
};

const recentActivity = [
  { id: 1, action: "Container started", resource: "billing-api", provider: "docker", time: "2 min ago" },
  { id: 2, action: "DNS record updated", resource: "api.afterdarksys.com", provider: "aws", time: "15 min ago" },
  { id: 3, action: "Instance rebooted", resource: "web-server-01", provider: "oci", time: "1 hour ago" },
  { id: 4, action: "Deployment completed", resource: "admin-panel v2.1.0", provider: "docker", time: "2 hours ago" },
  { id: 5, action: "Secret rotated", resource: "jwt-secret", provider: "local", time: "5 hours ago" },
];

const alerts = [
  { id: 1, severity: "warning", message: "High CPU usage on arm-builder (85%)", time: "10 min ago" },
  { id: 2, severity: "info", message: "Agent ads-agent-03 reconnected", time: "30 min ago" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Overview of your infrastructure"
        actions={
          <Button>Add Resource</Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Compute Instances"
            value={mockStats.compute.total}
            icon={Server}
            iconColor="bg-blue-100 text-blue-600"
            breakdown={[
              { label: "Running", value: mockStats.compute.running, color: "bg-green-500" },
              { label: "Stopped", value: mockStats.compute.stopped, color: "bg-gray-400" },
            ]}
          />
          <StatsCard
            title="Containers"
            value={mockStats.containers.total}
            icon={Container}
            iconColor="bg-purple-100 text-purple-600"
            breakdown={[
              { label: "Docker", value: mockStats.containers.byProvider.docker, color: "bg-blue-500" },
              { label: "ECS", value: mockStats.containers.byProvider.aws, color: "bg-orange-500" },
            ]}
          />
          <StatsCard
            title="DNS Zones"
            value={mockStats.dns.zones}
            icon={Globe}
            iconColor="bg-green-100 text-green-600"
            change={{ value: 12, type: "increase" }}
          />
          <StatsCard
            title="Active Agents"
            value={`${mockStats.agents.online}/${mockStats.agents.total}`}
            icon={Radio}
            iconColor="bg-indigo-100 text-indigo-600"
            breakdown={[
              { label: "Online", value: mockStats.agents.online, color: "bg-green-500" },
              { label: "Offline", value: mockStats.agents.offline, color: "bg-red-500" },
            ]}
          />
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Cost Summary</h2>
              <select className="rounded-md border border-gray-200 px-3 py-1.5 text-sm">
                <option>This Month</option>
                <option>Last Month</option>
                <option>Last 90 Days</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Month to Date</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${mockStats.costs.mtd.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Projected</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${mockStats.costs.projected.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="text-2xl font-semibold text-green-600">
                  On Track
                </p>
              </div>
            </div>
            {/* Provider breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-600">AWS</span>
                </div>
                <span className="text-sm font-medium text-gray-900">$523.45</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">Oracle Cloud</span>
                </div>
                <span className="text-sm font-medium text-gray-900">$0.00 (Free Tier)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600">Docker (Local)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">$0.00</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Activity className="h-8 w-8 mb-2" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-lg p-3 ${
                      alert.severity === "warning"
                        ? "bg-yellow-50"
                        : "bg-blue-50"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 mt-0.5 ${
                        alert.severity === "warning"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="divide-y">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    {activity.provider === "docker" && <Container className="h-5 w-5 text-blue-600" />}
                    {activity.provider === "aws" && <Server className="h-5 w-5 text-orange-600" />}
                    {activity.provider === "oci" && <Server className="h-5 w-5 text-red-600" />}
                    {activity.provider === "local" && <Key className="h-5 w-5 text-gray-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.resource}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {activity.provider}
                  </span>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
