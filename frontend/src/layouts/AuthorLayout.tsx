import { BookOpen, MessagesSquare, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

const NAV = [
  { to: "/books", label: "My Books", icon: <BookOpen className="size-4" /> },
  { to: "/tickets", label: "My Tickets", icon: <MessagesSquare className="size-4" />, end: true },
];

export function AuthorLayout() {
  const navigate = useNavigate();
  return (
    <AppShell
      subtitle="Author Portal"
      nav={NAV}
      headerExtra={
        <Button size="sm" icon={<PenSquare className="size-3.5" />} onClick={() => navigate("/tickets/new")}>
          <span className="hidden sm:inline">New query</span>
        </Button>
      }
    />
  );
}
