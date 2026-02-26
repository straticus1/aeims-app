"use client";

import { Header } from "@/components/dashboard/header";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BuildsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Builds"
        subtitle="Manage CI/CD pipelines and builds"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Build
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Build Management
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Monitor and manage CI/CD pipelines, build artifacts, and deployment automation.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Configure Your First Build
          </Button>
        </div>
      </div>
    </div>
  );
}
