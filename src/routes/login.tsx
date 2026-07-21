import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Building2, FileCheck2 } from "lucide-react";

import logoFull from "@/assets/logo-full.png";
import authCoverBg from "@/assets/auth-cover-login-bg.svg";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services";
import { authStore, type AuthUser } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Dvarif" },
      { name: "description", content: "Sign in to your Dvarif workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.login({ email, password, rememberMe });
      if (!res?.token || !res?.user) throw new Error("Invalid response from server");
      authStore.setSession(res.token, res.user as AuthUser);
      toast.success(`Welcome back, ${res.user.full_name.split(" ")[0]}`);
      router.navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex justify-center lg:justify-start">
            <img
              src={logoFull}
              alt="Dvarif — Document Verification Platform"
              className="h-14 w-auto object-contain dark:invert dark:brightness-0 dark:contrast-100"
            />
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in to your workspace
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your work email to access the verification network.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
              />
              Keep me signed in on this device
            </label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:text-left">
            By continuing, you agree to Dvarif's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Marketing column */}
      <div className="relative hidden overflow-hidden border-l border-border bg-background lg:block">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) scale(1.05); }
            50% { transform: translateY(-18px) scale(1.05); }
          }
        `}</style>
        <img
          src={authCoverBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover origin-center"
          style={{ animation: "float 6s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Trusted by HR & compliance teams
            </div>
            <h2 className="mt-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-foreground">
              A verified network for the documents your business relies on.
            </h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Submit, receive, and settle verification requests between organizations —
              with a clear audit trail, in minutes instead of days.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureTile
              icon={<Building2 className="h-4 w-4" />}
              title="Cross-org"
              body="One shared network of verified organizations."
            />
            <FeatureTile
              icon={<FileCheck2 className="h-4 w-4" />}
              title="Auditable"
              body="Every action is timestamped and logged."
            />
            <FeatureTile
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Secure"
              body="Enterprise-grade access controls and encryption."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 backdrop-blur">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
