import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Users } from "lucide-react";

export const Route = createFileRoute("/client/")({
  component: ClientDashboard,
});

interface Organization {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    departments: number;
  };
}

function ClientDashboard() {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/client/organizations",
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Book an Appointment</h1>
        <p className="text-muted-foreground">
          Welcome {session?.user?.name}! Select an organization to start
          booking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No organizations available at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Building2 className="h-10 w-10 text-primary mb-2" />
                </div>
                <CardTitle className="text-xl">{org.name}</CardTitle>
                {org.description && (
                  <CardDescription className="line-clamp-2">
                    {org.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{org._count?.departments || 0} departments</span>
                  </div>
                </div>
                <Link
                  to="/client/organizations/$orgId"
                  params={{ orgId: org.id }}
                >
                  <Button className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
