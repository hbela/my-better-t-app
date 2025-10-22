import {
  createFileRoute,
  useNavigate,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/client/organizations/$orgId")({
  component: DepartmentSelection,
});

interface Department {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    providers: number;
  };
}

interface Organization {
  id: string;
  name: string;
  description?: string | null;
}

function DepartmentSelection() {
  const { orgId } = Route.useParams();
  const navigate = useNavigate();
  const matches = useMatches();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if we're on a child route (like departments/$deptId)
  // If there are more than 2 matches (root + orgId + child), we're on a child route
  const isChildRoute =
    matches.length > 2 && matches[matches.length - 1].id !== Route.id;

  console.log(
    "$orgId route - isChildRoute:",
    isChildRoute,
    "matches:",
    matches.map((m) => m.id),
    "Route.id:",
    Route.id
  );

  useEffect(() => {
    if (!isChildRoute) {
      fetchData();
    }
  }, [orgId, isChildRoute]);

  const fetchData = async () => {
    try {
      const [orgResponse, deptResponse] = await Promise.all([
        fetch(`http://localhost:3000/api/client/organizations/${orgId}`, {
          credentials: "include",
        }),
        fetch(
          `http://localhost:3000/api/client/organizations/${orgId}/departments`,
          {
            credentials: "include",
          }
        ),
      ]);

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData);
      }

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        console.log("Fetched departments:", deptData);
        setDepartments(deptData);
      } else {
        console.error("Failed to fetch departments:", deptResponse.status);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // If on child route, render the child component
  if (isChildRoute) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate({ to: "/client" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Organizations
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{organization?.name}</h1>
        {organization?.description && (
          <p className="text-muted-foreground">{organization.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Select a department to view available providers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No departments available in this organization.
              </p>
            </CardContent>
          </Card>
        ) : (
          departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Users2 className="h-10 w-10 text-primary mb-2" />
                </div>
                <CardTitle className="text-xl">{dept.name}</CardTitle>
                {dept.description && (
                  <CardDescription className="line-clamp-2">
                    {dept.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users2 className="h-4 w-4" />
                  <span>{dept._count?.providers || 0} providers available</span>
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    console.log("Button clicked! Navigating to:", {
                      orgId,
                      deptId: dept.id,
                    });
                    try {
                      await navigate({
                        to: "/client/organizations/$orgId/departments/$deptId",
                        params: { orgId, deptId: dept.id },
                      });
                      console.log("Navigation completed");
                    } catch (error) {
                      console.error("Navigation error:", error);
                    }
                  }}
                >
                  View Providers
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
