import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({
  next: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Gevon BusinessOS" },
      { name: "description", content: "Sign in or create your Gevon BusinessOS account." },
    ],
  }),
  component: AuthPage,
});

function sanitizeNext(next: string | undefined): string {
  if (!next) return "/app";
  if (!next.startsWith("/") || next.startsWith("//")) return "/app";
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const next = sanitizeNext(search.next);
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");

  useEffect(() => {
    let active = true;
    const storedNext = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("gevon:next") : null;
    if (storedNext) sessionStorage.removeItem("gevon:next");
    const finalNext = sanitizeNext(search.next || storedNext || undefined);

    const handleAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (active && data.session) {
        navigate({ to: finalNext, replace: true });
      }
    };
    handleAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate({ to: finalNext, replace: true });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, search.next]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-gradient-brand p-12 text-brand-foreground lg:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-foreground/15 backdrop-blur">
              <span className="font-display text-sm font-bold">G</span>
            </div>
            <span className="font-display text-lg font-semibold">Gevon BusinessOS</span>
          </Link>
          <div>
            <p className="font-display text-3xl font-semibold leading-tight text-balance">
              The operating system for African businesses.
            </p>
            <p className="mt-4 text-sm opacity-80">
              CRM, inventory, sales, accounting, HR, payments — one platform, built for
              multi-company, multi-branch, multi-currency operations from day one.
            </p>
          </div>
          <p className="text-xs opacity-70">© {new Date().getFullYear()} Gevon Technologies</p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground">
                <span className="font-display text-sm font-bold">G</span>
              </div>
              <span className="font-display text-lg font-semibold">Gevon</span>
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {tab === "forgot" ? "Reset password" : tab === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "forgot"
                ? "We'll email you a reset link."
                : tab === "signup"
                ? "Start running your business from one place."
                : "Sign in to your Gevon account."}
            </p>

            {tab !== "forgot" && (
              <>
                <div className="mt-6">
                  <GoogleButton next={next} />
                </div>
                <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>or with email</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              {tab !== "forgot" && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="signin" className="mt-4">
                <SignInForm next={next} onForgot={() => setTab("forgot")} />
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <SignUpForm next={next} />
              </TabsContent>
              <TabsContent value="forgot" className="mt-4">
                <ForgotForm onBack={() => setTab("signin")} />
              </TabsContent>
            </Tabs>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              By continuing you agree to our{" "}
              <Link to="/legal/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
              <Link to="/legal/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          sessionStorage.setItem("gevon:next", next);
        } catch {}
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin + "/auth",
        });
        if (result.error) {
          toast.error(result.error.message || "Google sign-in failed");
          setLoading(false);
          return;
        }
        if (result.redirected) return;
        setLoading(false);
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.7 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-3.5 5.4-6 9.6-6 2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5c-7.6 0-14.1 4.3-17.3 10.7z"/>
          <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5c-1.8 1.4-4.2 2.3-6.9 2.3-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.2 43.5 24 43.5z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.4-4.3 5.8l6 5c-.4.4 6.5-4.7 6.5-14.8 0-1.2-.1-2.3-.4-3.5z"/>
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function SignInForm({ next, onForgot }: { next: string; onForgot: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) return toast.error(error.message);
        toast.success("Welcome back");
        navigate({ to: next, replace: true });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button type="button" onClick={onForgot} className="text-xs text-muted-foreground hover:text-foreground">Forgot?</button>
        </div>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm({ next }: { next: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return toast.error("Password must be at least 8 characters");
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth" + (next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""),
            data: { full_name: fullName },
          },
        });
        setLoading(false);
        if (error) return toast.error(error.message);
        if (data.session) {
          toast.success("Welcome to Gevon");
          navigate({ to: next, replace: true });
        } else {
          toast.success("Check your email to confirm your account");
        }
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Work email</Label>
        <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
        <p className="text-xs text-muted-foreground">Minimum 8 characters. Checked against known breaches.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        setLoading(false);
        if (error) return toast.error(error.message);
        toast.success("Check your email for the reset link");
        onBack();
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send link
        </Button>
      </div>
    </form>
  );
}
