import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [userRole, setUserRole] = useState<string>("USER");

  // Determine user role - directly from user object
  useEffect(() => {
    if (session?.user) {
      // @ts-ignore - role is UserRole enum
      const role = session.user.role || "CLIENT";

      // Role is directly available - no API calls needed!
      setUserRole(role);

      console.log("👤 Logged in user:", {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        needsPasswordChange: session.user.needsPasswordChange,
      });
    }
  }, [session]);

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Button variant="outline" asChild>
        <Link to="/login">Sign In</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">{session.user.name}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex flex-col items-start">
          <span className="font-medium">{session.user.email}</span>
          <span className="text-xs text-muted-foreground">
            Role: {userRole}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    // Always redirect to test-external-app.html after logout
                    // This will be deployed as a separate static website
                    window.location.href =
                      "http://127.0.0.1:5500/test-external-app.html";
                  },
                },
              });
            }}
          >
            Sign Out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
