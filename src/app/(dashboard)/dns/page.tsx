"use client";

import { Header } from "@/components/dashboard/header";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DNSPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="DNS Management"
        subtitle="Manage DNS zones and records"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            DNS Management
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Manage DNS zones and records across Route53, Oracle DNS, and other providers.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Zone
          </Button>
        </div>
      </div>
    </div>
  );
}
