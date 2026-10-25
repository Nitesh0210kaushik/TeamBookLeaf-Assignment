import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { RealtimeProvider, useRealtime } from "@/hooks/useRealtime";
import { cn } from "@/lib/cn";
import { useLogoutMutation, useMeQuery } from "@/store/api/authApi";
import { Logo } from "./Logo";

export type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

function LiveIndicator() {
  const { connected } = useRealtime();
  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex"
      title={
        connected
          ? "Updates appear instantly"
          : "Reconnecting — refreshing every 20 seconds meanwhile"
      }
    >
      <span className={cn("size-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-400")} />
      {connected ? "Live" : "Reconnecting"}
    </span>
  );
}

function UserMenu() {
  const { data: user } = useMeQuery();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight md:block">
        <div className="text-sm font-medium text-ink">{user?.name}</div>
        <div className="text-xs text-muted">{user?.email}</div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-slate-100 hover:text-ink"
        title="Log out"
        aria-label="Log out"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

export function AppShell({
  subtitle,
  nav,
  headerExtra,
  wide,
}: {
  subtitle: string;
  nav: NavItem[];
  headerExtra?: ReactNode;
  wide?: boolean;
}) {
  return (
    <RealtimeProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
          <div
            className={cn(
              "mx-auto flex h-16 items-center gap-6 px-4 sm:px-6",
              wide ? "max-w-[1400px]" : "max-w-6xl",
            )}
          >
            <Logo subtitle={subtitle} />
            <nav className="flex items-center gap-1">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-muted hover:bg-slate-100 hover:text-ink",
                    )
                  }
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-4">
              {headerExtra}
              <LiveIndicator />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className={cn("mx-auto px-4 py-8 sm:px-6", wide ? "max-w-[1400px]" : "max-w-6xl")}>
          <Outlet />
        </main>
      </div>
    </RealtimeProvider>
  );
}
