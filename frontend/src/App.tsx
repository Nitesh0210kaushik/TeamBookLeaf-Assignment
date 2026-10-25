import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "@/components/ui/States";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthorLayout } from "@/layouts/AuthorLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RequireRole, RootRedirect } from "@/routes/RequireRole";

// Each portal is split into its own chunks: authors never download the admin console.
const page = <T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(() => loader().then((module) => ({ default: module[name] })));

const MyBooksPage = page(() => import("@/pages/author/MyBooksPage"), "MyBooksPage");
const MyTicketsPage = page(() => import("@/pages/author/MyTicketsPage"), "MyTicketsPage");
const NewTicketPage = page(() => import("@/pages/author/NewTicketPage"), "NewTicketPage");
const TicketDetailPage = page(() => import("@/pages/author/TicketDetailPage"), "TicketDetailPage");
const QueuePage = page(() => import("@/pages/admin/QueuePage"), "QueuePage");
const AdminTicketPage = page(() => import("@/pages/admin/AdminTicketPage"), "AdminTicketPage");

export function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-[50vh]" />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireRole role="author" />}>
          <Route element={<AuthorLayout />}>
            <Route path="/books" element={<MyBooksPage />} />
            <Route path="/tickets" element={<MyTicketsPage />} />
            <Route path="/tickets/new" element={<NewTicketPage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/tickets" replace />} />
            <Route path="/admin/tickets" element={<QueuePage />} />
            <Route path="/admin/tickets/:ticketId" element={<AdminTicketPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
