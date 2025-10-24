import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Trash2, Key, Calendar, User } from "lucide-react";

export const Route = createFileRoute("/admin/api-keys")({
  component: ApiKeysComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }

    // Check if user has ADMIN role
    // @ts-ignore - role is UserRole enum
    if (session.data.user.role !== "ADMIN") {
      throw redirect({
        to: "/owner",
      });
    }

    return { session };
  },
});

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  metadata: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  expiresAt: string | null;
  lastRequest: string | null;
  enabled: boolean;
  remaining: number | null;
  requestCount: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
}

function ApiKeysComponent() {
  const { session } = Route.useRouteContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);

  const [newKey, setNewKey] = useState({
    organizationId: "",
    name: "",
    expiresInDays: "",
  });

  // Load API keys
  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/admin/api-keys`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      } else {
        toast.error("Failed to load API keys");
      }
    } catch (err) {
      toast.error("Error loading API keys");
    } finally {
      setLoading(false);
    }
  };

  // Load organizations
  const loadOrganizations = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/admin/organizations`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else {
        toast.error("Failed to load organizations");
      }
    } catch (err) {
      toast.error("Error loading organizations");
    }
  };

  // Generate API key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.organizationId || !newKey.name) {
      toast.error("Organization and name are required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/admin/api-keys/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            organizationId: newKey.organizationId,
            name: newKey.name,
            expiresInDays: newKey.expiresInDays
              ? parseInt(newKey.expiresInDays)
              : undefined,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGeneratedKey(data.key);
        setShowGeneratedKey(true);
        setNewKey({ organizationId: "", name: "", expiresInDays: "" });
        toast.success("API key generated successfully");
        loadApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate API key");
      }
    } catch (err) {
      toast.error("Error generating API key");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/admin/api-keys/${keyId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("API key revoked successfully");
        loadApiKeys();
      } else {
        toast.error("Failed to revoke API key");
      }
    } catch (err) {
      toast.error("Error revoking API key");
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if key is expired
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  useEffect(() => {
    loadApiKeys();
    loadOrganizations();
  }, []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">API Key Management</h1>
        <p className="text-muted-foreground">
          Manage API keys for external app integration
        </p>
      </div>

      {/* Generated Key Modal */}
      {showGeneratedKey && generatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Key Generated
              </CardTitle>
              <CardDescription>
                Copy this key now - it won't be shown again!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {generatedKey}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(generatedKey)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGeneratedKey(false);
                    setGeneratedKey(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6">
        {/* Generate New API Key */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New API Key</CardTitle>
            <CardDescription>
              Create a new API key for an organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Select
                    value={newKey.organizationId}
                    onValueChange={(value) =>
                      setNewKey({ ...newKey, organizationId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} {!org.enabled && "(Disabled)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="External App Integration"
                    value={newKey.name}
                    onChange={(e) =>
                      setNewKey({ ...newKey, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (days, optional)</Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="30"
                  value={newKey.expiresInDays}
                  onChange={(e) =>
                    setNewKey({ ...newKey, expiresInDays: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Generating..." : "Generate API Key"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage existing API keys</CardDescription>
            <Button
              onClick={loadApiKeys}
              disabled={loading}
              variant="outline"
              className="mt-2"
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No API keys found. Generate one to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isExpired(key.expiresAt)
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : key.enabled
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {isExpired(key.expiresAt)
                              ? "Expired"
                              : key.enabled
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Organization:{" "}
                          {(() => {
                            try {
                              const metadata = JSON.parse(key.metadata || "{}");
                              const orgId = metadata.organizationId;
                              return (
                                organizations.find((org) => org.id === orgId)
                                  ?.name ||
                                orgId ||
                                "Unknown"
                              );
                            } catch {
                              return "Unknown";
                            }
                          })()}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Created by {key.user.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created {formatDate(key.createdAt)}
                          </div>
                          {key.lastRequest && (
                            <div className="flex items-center gap-1">
                              Last used {formatDate(key.lastRequest)}
                            </div>
                          )}
                          {key.expiresAt && (
                            <div className="flex items-center gap-1">
                              Expires {formatDate(key.expiresAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
