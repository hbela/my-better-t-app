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
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
      });
    }

    // Check if user has ADMIN system role
    if (session.data.user.systemRole !== "ADMIN") {
      throw redirect({
        to: "/dashboard",
      });
    }

    return { session };
  },
});

function AdminComponent() {
  const { session } = Route.useRouteContext();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    logo: "",
  });

  const [userRole, setUserRole] = useState({
    userId: "",
    role: "",
  });

  // Load organizations
  const loadOrganizations = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Create organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.name || !newOrg.slug) {
      toast.error("Name and slug are required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await authClient.organization.create({
        name: newOrg.name,
        slug: newOrg.slug,
        logo: newOrg.logo || undefined,
      });

      if (error) {
        toast.error(error.message || "Failed to create organization");
      } else {
        toast.success("Organization created successfully");
        setNewOrg({ name: "", slug: "", logo: "" });
        loadOrganizations();
      }
    } catch (err) {
      toast.error("Error creating organization");
    } finally {
      setLoading(false);
    }
  };

  // Delete organization
  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/admin/organizations/${orgId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Organization deleted successfully");
        loadOrganizations();
      } else {
        toast.error("Failed to delete organization");
      }
    } catch (err) {
      toast.error("Error deleting organization");
    } finally {
      setLoading(false);
    }
  };

  // Set user role
  const handleSetUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole.userId || !userRole.role) {
      toast.error("User ID and role are required");
      return;
    }

    setLoading(true);
    try {
      await authClient.admin.setRole({
        userId: userRole.userId,
        role: userRole.role as any,
      });
      toast.success("System role updated successfully");
      setUserRole({ userId: "", role: "" });
    } catch (err) {
      toast.error("Error updating system role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {session.data?.user.name} (Admin)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Organization */}
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>
              Add a new organization to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Corp"
                  value={newOrg.name}
                  onChange={(e) =>
                    setNewOrg({ ...newOrg, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug (URL-friendly)</Label>
                <Input
                  id="org-slug"
                  placeholder="acme-corp"
                  value={newOrg.slug}
                  onChange={(e) =>
                    setNewOrg({ ...newOrg, slug: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-logo">Logo URL (optional)</Label>
                <Input
                  id="org-logo"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={newOrg.logo}
                  onChange={(e) =>
                    setNewOrg({ ...newOrg, logo: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Organization"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Manage System Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Manage System Roles</CardTitle>
            <CardDescription>
              Assign system-wide roles to users (ADMIN, USER, MODERATOR)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetUserRole} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  placeholder="user-id-here"
                  value={userRole.userId}
                  onChange={(e) =>
                    setUserRole({ ...userRole, userId: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">System Role</Label>
                <Input
                  id="role"
                  placeholder="ADMIN, USER, MODERATOR, etc."
                  value={userRole.role}
                  onChange={(e) =>
                    setUserRole({ ...userRole, role: e.target.value })
                  }
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Updating..." : "Set System Role"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Manage all organizations in the system
          </CardDescription>
          <Button
            onClick={loadOrganizations}
            disabled={loading}
            className="mt-2"
          >
            {loading ? "Loading..." : "Load Organizations"}
          </Button>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organizations loaded. Click "Load Organizations" to fetch.
            </p>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    {org.logo && (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="h-10 w-10 rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Slug: {org.slug}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {org.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Members: {org.members?.length || 0}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteOrg(org.id)}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
