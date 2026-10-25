import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Bot, Clock3, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getErrorMessage } from "@/lib/errors";
import { HOME_BY_ROLE } from "@/routes/RequireRole";
import { useLoginMutation, useMeQuery } from "@/store/api/authApi";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  usePageTitle("Sign in");
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentUser } = useMeQuery();
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (currentUser) {
    return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    const user = await login(values).unwrap().catch(() => null);
    if (!user) return;
    const from = (location.state as { from?: string } | null)?.from;
    // Only return to the page they came from if it belongs to their portal.
    const canReturn = from && (user.role === "admin") === from.startsWith("/admin");
    navigate(canReturn ? from : HOME_BY_ROLE[user.role], { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col">
        <Logo subtitle="Publishing" inverted />
        <div className="mt-auto max-w-md">
          <h1 className="font-serif text-4xl leading-tight font-semibold">
            Answers for authors, without the wait.
          </h1>
          <p className="mt-4 text-brand-100">
            Track your books and royalties, raise a query in a minute, and hear back from the BookLeaf team in one place.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-brand-50">
            <li className="flex gap-3"><Clock3 className="size-5 shrink-0 text-leaf-500" />Live updates the moment our team replies</li>
            <li className="flex gap-3"><Bot className="size-5 shrink-0 text-leaf-500" />AI-assisted triage so urgent issues are seen first</li>
            <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-leaf-500" />Your data is visible only to you and the BookLeaf team</li>
          </ul>
        </div>
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-brand-600/40 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo subtitle="Publishing" /></div>
          <h2 className="mt-8 font-serif text-2xl font-semibold lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Authors and BookLeaf team members use the same login.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {getErrorMessage(error)}
              </p>
            )}
            <Button type="submit" className="w-full" loading={isLoading} icon={!isLoading && <ArrowRight className="size-4" />}>
              Sign in
            </Button>
          </form>

          <div className="mt-8 border-t border-line pt-6 text-center text-xs leading-relaxed text-muted">
            <p>
              New to BookLeaf? Your author account is created by our team when you start publishing with us —
              sign in with the email you registered with.
            </p>
            <p className="mt-2">Trouble signing in? Contact the BookLeaf author support team.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
