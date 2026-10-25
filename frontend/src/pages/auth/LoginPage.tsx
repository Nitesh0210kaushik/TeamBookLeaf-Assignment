import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (currentUser) {
    return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    const user = await login(values)
      .unwrap()
      .catch(() => null);
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
            Track your books and royalties, and reach the BookLeaf team in one place.
          </p>
        </div>
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-brand-600/40 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo subtitle="Publishing" />
          </div>
          <h2 className="mt-8 font-serif text-2xl font-semibold lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your BookLeaf account email and password.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted transition hover:text-ink focus-visible:ring-3 focus-visible:ring-brand-200 focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {getErrorMessage(error)}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              icon={!isLoading && <ArrowRight className="size-4" />}
            >
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
