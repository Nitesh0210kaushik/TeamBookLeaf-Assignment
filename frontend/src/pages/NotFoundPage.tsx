import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/States";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
            Go to your dashboard
          </Link>
        }
      />
    </div>
  );
}
