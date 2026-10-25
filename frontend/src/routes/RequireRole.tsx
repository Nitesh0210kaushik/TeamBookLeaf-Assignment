import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/States";
import { useMeQuery } from "@/store/api/authApi";
import type { Role } from "@/types/api";

export const HOME_BY_ROLE: Record<Role, string> = {
  author: "/books",
  admin: "/admin/tickets",
};

/** Client-side guard for UX only — the API enforces the same rules on every request. */
export function RequireRole({ role }: { role: Role }) {
  const location = useLocation();
  const { data: user, isLoading, isError } = useMeQuery();

  if (isLoading) {
    return <Spinner label="Loading your workspace…" className="min-h-screen" />;
  }

  if (isError || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== role) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }

  return <Outlet />;
}

export function RootRedirect() {
  const { data: user, isLoading, isError } = useMeQuery();
  if (isLoading) return <Spinner className="min-h-screen" />;
  if (isError || !user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}
