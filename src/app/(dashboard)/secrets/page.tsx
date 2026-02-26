"use client";

import { Header } from "@/components/dashboard/header";
import { Key, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SecretsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Secrets Management"
        subtitle="Securely store and manage secrets"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Secret
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded-lg border bg-white p-12 text-center">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Secrets Management
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Store API keys, credentials, and other sensitive data securely using HashiCorp Vault and cloud secret managers.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Store Your First Secret
          </Button>
        </div>
      </div>
    </div>
  );
}
