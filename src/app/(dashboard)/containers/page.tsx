"use client";

import { Header } from "@/components/dashboard/header";
import { Container, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContainersPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Containers"
        subtitle="Manage your containerized workloads"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Deploy Container
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <Container className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Container Management
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            View and manage containers across Docker, AWS ECS, and other container platforms.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Deploy Your First Container
          </Button>
        </div>
      </div>
    </div>
  );
}
