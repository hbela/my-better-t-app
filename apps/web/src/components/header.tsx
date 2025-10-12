import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session.data?.user.systemRole === "ADMIN") {
        setIsAdmin(true);
      }
    });
  }, []);

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className="text-orange-500 font-semibold">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
