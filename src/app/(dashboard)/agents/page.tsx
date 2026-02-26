"use client";

import { useState, useEffect } from "react";
import { Radio, Activity, Server, AlertCircle } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Agent {
  id: string;
  name: string;
  hostname?: string;
  arch?: string;
  os?: string;
  version?: string;
  publicIp?: string;
  privateIp?: string;
  status: string;
  capabilities?: any;
  lastSeenAt?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ONLINE: "bg-green-100 text-green-800",
  OFFLINE: "bg-gray-100 text-gray-800",
  DEGRADED: "bg-yellow-100 text-yellow-800",
  MAINTENANCE: "bg-blue-100 text-blue-800",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="AEIMS Agents"
        subtitle={`${agents.filter(a => a.status === 'ONLINE').length} online / ${agents.length} total agents`}
        actions={
          <Button>
            Register Agent
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Activity className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <Radio className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No agents</h3>
            <p className="mt-1 text-sm text-gray-500">
              Deploy AEIMS agents to manage resources on remote servers and edge locations.
            </p>
            <div className="mt-6">
              <Button>
                Register Your First Agent
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <Radio className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {agent.name}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            statusColors[agent.status]
                          )}
                        >
                          <span
                            className={cn(
                              "mr-1.5 h-1.5 w-1.5 rounded-full",
                              agent.status === "ONLINE" && "bg-green-500",
                              agent.status === "OFFLINE" && "bg-gray-400",
                              agent.status === "DEGRADED" && "bg-yellow-500",
                              agent.status === "MAINTENANCE" && "bg-blue-500"
                            )}
                          />
                          {agent.status}
                        </span>
                      </div>
                      {agent.hostname && (
                        <p className="text-sm text-gray-500 mb-2">
                          {agent.hostname}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {agent.arch && <span>Architecture: {agent.arch}</span>}
                        {agent.os && <span>OS: {agent.os}</span>}
                        {agent.version && <span>Version: {agent.version}</span>}
                        {agent.lastSeenAt && (
                          <span>
                            Last seen: {new Date(agent.lastSeenAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {(agent.publicIp || agent.privateIp) && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 font-mono">
                          {agent.publicIp && <span>Public: {agent.publicIp}</span>}
                          {agent.privateIp && <span>Private: {agent.privateIp}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
