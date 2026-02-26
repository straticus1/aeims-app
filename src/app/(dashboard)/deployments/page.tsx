"use client";

import { Header } from "@/components/dashboard/header";
import { Rocket, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeploymentsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Deployments"
        subtitle="Track and manage deployments"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <Rocket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Deployment Management
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Track application deployments, rollbacks, and release history across all environments.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Deployment
          </Button>
        </div>
      </div>
    </div>
  );
}
