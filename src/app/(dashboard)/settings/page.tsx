"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Plus,
  Trash2,
  Key,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface CloudCredential {
  id: string;
  provider: string;
  name: string;
  description?: string;
  region?: string;
  isValid: boolean;
  lastValidated?: string;
  lastScanAt?: string;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_INFO: Record<string, { label: string; color: string; fields: string[] }> = {
  AWS: {
    label: "Amazon Web Services",
    color: "bg-orange-100 text-orange-800",
    fields: ["accessKeyId", "secretAccessKey", "region"],
  },
  OCI: {
    label: "Oracle Cloud Infrastructure",
    color: "bg-red-100 text-red-800",
    fields: ["tenancy", "user", "fingerprint", "privateKey", "region"],
  },
  GCP: {
    label: "Google Cloud Platform",
    color: "bg-blue-100 text-blue-800",
    fields: ["projectId", "privateKey", "clientEmail"],
  },
  AZURE: {
    label: "Microsoft Azure",
    color: "bg-cyan-100 text-cyan-800",
    fields: ["subscriptionId", "tenantId", "clientId", "clientSecret"],
  },
  CLOUDFLARE: {
    label: "Cloudflare",
    color: "bg-amber-100 text-amber-800",
    fields: ["apiToken"],
  },
  DOCKER: {
    label: "Docker",
    color: "bg-indigo-100 text-indigo-800",
    fields: [],
  },
  KUBERNETES: {
    label: "Kubernetes",
    color: "bg-purple-100 text-purple-800",
    fields: ["kubeconfig"],
  },
};

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<CloudCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanning, setScanning] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials);
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const scanCredential = async (id: string) => {
    setScanning(id);
    try {
      const response = await fetch(`/api/credentials/${id}/scan`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `Scan completed!\n\nResources discovered:\n${data.resourcesStored} resources stored`
        );
        fetchCredentials();
      } else {
        const error = await response.json();
        alert(`Scan failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error("Error scanning credential:", error);
      alert("Error scanning credential");
    } finally {
      setScanning(null);
    }
  };

  const deleteCredential = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential?")) {
      return;
    }

    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCredentials(credentials.filter((c) => c.id !== id));
      } else {
        alert("Failed to delete credential");
      }
    } catch (error) {
      console.error("Error deleting credential:", error);
      alert("Error deleting credential");
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="Manage your cloud provider credentials and AEIMS configuration"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credential
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Cloud Provider Credentials
          </h2>
          <p className="text-sm text-gray-500">
            Add your cloud provider API keys to scan and manage resources across multiple clouds.
            Credentials are encrypted at rest and never shared.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <Cloud className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No credentials</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first cloud provider credential.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Credential
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <Cloud className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {credential.name}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase",
                            PROVIDER_INFO[credential.provider]?.color
                          )}
                        >
                          {credential.provider}
                        </span>
                        {credential.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {credential.description && (
                        <p className="text-sm text-gray-500 mb-2">
                          {credential.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {credential.region && <span>Region: {credential.region}</span>}
                        {credential.lastValidated && (
                          <span>
                            Last validated:{" "}
                            {new Date(credential.lastValidated).toLocaleString()}
                          </span>
                        )}
                        {credential.lastScanAt && (
                          <span>
                            Last scanned: {new Date(credential.lastScanAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scanCredential(credential.id)}
                      disabled={scanning === credential.id}
                    >
                      {scanning === credential.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Scan Resources
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCredential(credential.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCredentialModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCredentials();
          }}
        />
      )}
    </div>
  );
}

function AddCredentialModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [provider, setProvider] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          name,
          description,
          region: region || undefined,
          credentials,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error adding credential:", error);
      alert("Error adding credential");
    } finally {
      setSubmitting(false);
    }
  };

  const providerInfo = provider ? PROVIDER_INFO[provider] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Add Cloud Credential</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setCredentials({});
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a provider</option>
              {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Production AWS Account"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this credential"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region (optional)
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., us-east-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {providerInfo && providerInfo.fields.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900">
                {providerInfo.label} Credentials
              </h3>
              {providerInfo.fields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <div className="relative">
                    {field.toLowerCase().includes("key") ||
                    field.toLowerCase().includes("secret") ||
                    field.toLowerCase().includes("token") ? (
                      <>
                        <input
                          type={showSecrets[field] ? "text" : "password"}
                          value={credentials[field] || ""}
                          onChange={(e) =>
                            setCredentials({ ...credentials, [field]: e.target.value })
                          }
                          required
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowSecrets({
                              ...showSecrets,
                              [field]: !showSecrets[field],
                            })
                          }
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecrets[field] ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </>
                    ) : field === "kubeconfig" || field === "privateKey" ? (
                      <textarea
                        value={credentials[field] || ""}
                        onChange={(e) =>
                          setCredentials({ ...credentials, [field]: e.target.value })
                        }
                        required
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={credentials[field] || ""}
                        onChange={(e) =>
                          setCredentials({ ...credentials, [field]: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !provider}>
              {submitting ? "Adding..." : "Add Credential"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
