import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
      <Logo subtitle="Publishing" />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="font-serif text-7xl font-semibold text-brand-700">404</p>
        <h1 className="mt-4 text-xl font-semibold text-ink">This page doesn't exist</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          The link may be broken or the page may have moved. Your books and tickets are safe — head back to your
          dashboard.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-brand-800"
        >
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
