"use client";

import { useState } from "react";
import {
  Server,
  Play,
  Square,
  RotateCcw,
  MoreVertical,
  Filter,
  Plus,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Mock data - replace with real API calls
const mockInstances = [
  {
    id: "aws:i-0abc123def",
    provider: "aws",
    name: "web-server-01",
    state: "running",
    instanceType: "t3.medium",
    region: "us-east-1",
    zone: "us-east-1a",
    publicIp: "54.123.45.67",
    privateIp: "10.0.1.100",
    cpu: 2,
    memoryGb: 4,
  },
  {
    id: "aws:i-0def456ghi",
    provider: "aws",
    name: "api-server-01",
    state: "running",
    instanceType: "t3.large",
    region: "us-east-1",
    zone: "us-east-1b",
    publicIp: "54.123.45.68",
    privateIp: "10.0.1.101",
    cpu: 2,
    memoryGb: 8,
  },
  {
    id: "oci:ocid1.instance.oc1.iad.abc123",
    provider: "oci",
    name: "arm-builder",
    state: "running",
    instanceType: "VM.Standard.A1.Flex",
    region: "us-ashburn-1",
    zone: "AD-1",
    publicIp: "129.153.158.177",
    privateIp: "10.0.0.10",
    cpu: 4,
    memoryGb: 24,
  },
  {
    id: "oci:ocid1.instance.oc1.iad.def456",
    provider: "oci",
    name: "cache-01",
    state: "stopped",
    instanceType: "VM.Standard.A1.Flex",
    region: "us-ashburn-1",
    zone: "AD-2",
    publicIp: null,
    privateIp: "10.0.0.11",
    cpu: 2,
    memoryGb: 12,
  },
];

const providerColors: Record<string, string> = {
  aws: "bg-orange-100 text-orange-800",
  oci: "bg-red-100 text-red-800",
  gcp: "bg-blue-100 text-blue-800",
  azure: "bg-cyan-100 text-cyan-800",
};

const stateColors: Record<string, string> = {
  running: "bg-green-100 text-green-800",
  stopped: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-800",
};

export default function ComputePage() {
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const filteredInstances = mockInstances.filter((instance) => {
    if (filter === "all") return true;
    if (filter === "running") return instance.state === "running";
    if (filter === "stopped") return instance.state === "stopped";
    return instance.provider === filter;
  });

  const toggleSelect = (id: string) => {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInstances.length === filteredInstances.length) {
      setSelectedInstances([]);
    } else {
      setSelectedInstances(filteredInstances.map((i) => i.id));
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Compute Instances"
        subtitle={`${mockInstances.length} instances across ${
          new Set(mockInstances.map((i) => i.provider)).size
        } providers`}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Launch Instance
          </Button>
        }
      />

      <div className="p-6">
        {/* Filters & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({mockInstances.length})
            </Button>
            <Button
              variant={filter === "running" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("running")}
            >
              Running ({mockInstances.filter((i) => i.state === "running").length})
            </Button>
            <Button
              variant={filter === "stopped" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("stopped")}
            >
              Stopped ({mockInstances.filter((i) => i.state === "stopped").length})
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <Button
              variant={filter === "aws" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("aws")}
            >
              AWS
            </Button>
            <Button
              variant={filter === "oci" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("oci")}
            >
              OCI
            </Button>
          </div>

          {selectedInstances.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedInstances.length} selected
              </span>
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
              <Button variant="outline" size="sm">
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reboot
              </Button>
            </div>
          )}
        </div>

        {/* Instances Table */}
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedInstances.length === filteredInstances.length && filteredInstances.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region / Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resources
                </th>
                <th className="w-12 px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInstances.map((instance) => (
                <tr
                  key={instance.id}
                  className={cn(
                    "hover:bg-gray-50",
                    selectedInstances.includes(instance.id) && "bg-indigo-50"
                  )}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInstances.includes(instance.id)}
                      onChange={() => toggleSelect(instance.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <Server className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {instance.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {instance.id.split(":")[1]?.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase",
                        providerColors[instance.provider]
                      )}
                    >
                      {instance.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        stateColors[instance.state]
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 h-1.5 w-1.5 rounded-full",
                          instance.state === "running"
                            ? "bg-green-500"
                            : instance.state === "stopped"
                            ? "bg-gray-400"
                            : "bg-yellow-500"
                        )}
                      />
                      {instance.state}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {instance.instanceType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">{instance.region}</p>
                      <p className="text-xs text-gray-500">{instance.zone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {instance.publicIp ? (
                        <>
                          <p className="text-sm text-gray-900 font-mono">
                            {instance.publicIp}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {instance.privateIp}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 font-mono">
                          {instance.privateIp}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {instance.cpu} vCPU / {instance.memoryGb} GB
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
