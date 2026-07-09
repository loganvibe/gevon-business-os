import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { acceptInvite } from "@/lib/core.functions";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/accept-invite/$token")({
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const fn = useServerFn(acceptInvite);
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    fn({ data: { token } })
      .then(() => {
        setState("ok");
        setTimeout(() => navigate({ to: "/app", replace: true }), 1000);
      })
      .catch((e) => { setState("error"); setMsg(e?.message ?? "Could not accept invite"); });
  }, [fn, token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elev-2">
        {state === "loading" && (
          <><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">Accepting invite…</p></>
        )}
        {state === "ok" && (
          <><CheckCircle2 className="mx-auto h-8 w-8 text-brand" /><h1 className="mt-4 font-display text-xl font-semibold">You're in</h1><p className="mt-2 text-sm text-muted-foreground">Taking you to your workspace…</p></>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-semibold">Couldn't accept invite</h1>
            <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/app" })}>Go to Gevon</Button>
          </>
        )}
      </div>
    </div>
  );
}
