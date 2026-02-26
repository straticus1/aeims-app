"use client";

import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";

// Mock data - replace with real metrics
const mockMetrics = {
  systemHealth: {
    overall: 98.5,
    compute: 99.2,
    containers: 97.8,
    dns: 100,
  },
  alerts: [
    {
      id: 1,
      severity: "warning",
      resource: "arm-builder",
      message: "High CPU usage (85%)",
      time: "10 min ago",
    },
    {
      id: 2,
      severity: "info",
      resource: "ads-agent-03",
      message: "Agent reconnected",
      time: "30 min ago",
    },
  ],
  recentEvents: [
    {
      id: 1,
      type: "deployment",
      message: "Deployment completed: admin-panel v2.1.0",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "incident",
      message: "Network latency spike detected and resolved",
      time: "4 hours ago",
    },
  ],
};

export default function MonitoringPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Monitoring"
        subtitle="System health and performance metrics"
        actions={
          <Button>
            Configure Alerts
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Health Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Overall Health"
            value={`${mockMetrics.systemHealth.overall}%`}
            icon={Activity}
            iconColor="bg-green-100 text-green-600"
            change={{ value: 1.2, type: "increase" }}
          />
          <StatsCard
            title="Compute Health"
            value={`${mockMetrics.systemHealth.compute}%`}
            icon={Activity}
            iconColor="bg-blue-100 text-blue-600"
          />
          <StatsCard
            title="Container Health"
            value={`${mockMetrics.systemHealth.containers}%`}
            icon={Activity}
            iconColor="bg-purple-100 text-purple-600"
          />
          <StatsCard
            title="DNS Health"
            value={`${mockMetrics.systemHealth.dns}%`}
            icon={Activity}
            iconColor="bg-green-100 text-green-600"
          />
        </div>

        {/* Alerts & Events */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Alerts */}
          <div className="rounded-lg border bg-white">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            {mockMetrics.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle className="h-12 w-12 mb-2" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <div className="divide-y">
                {mockMetrics.alerts.map((alert) => (
                  <div key={alert.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 mt-0.5 ${
                          alert.severity === "warning"
                            ? "text-yellow-600"
                            : "text-blue-600"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.resource}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              alert.severity === "warning"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="rounded-lg border bg-white">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="divide-y">
              {mockMetrics.recentEvents.map((event) => (
                <div key={event.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        event.type === "deployment"
                          ? "bg-green-100"
                          : "bg-orange-100"
                      }`}
                    >
                      {event.type === "deployment" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{event.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Placeholder for metrics charts */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Metrics
          </h2>
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Metrics visualization coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
