import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Gevon BusinessOS" },
      { name: "description", content: "How Gevon Technologies collects, uses, and protects your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1 className="font-display">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        Gevon Technologies ("Gevon", "we") operates Gevon BusinessOS. We collect only the information
        required to provide the service: account credentials, company data you create, and audit
        metadata (IP, timestamps) for security.
      </p>
      <h2>Data you control</h2>
      <p>
        Your company data is isolated per tenant using Row Level Security. Only members you invite,
        with the roles you assign, can access it.
      </p>
      <h2>Security</h2>
      <p>
        We use encrypted connections, hashed credentials, and provider-managed authentication. Every
        privileged action is written to an append-only audit log.
      </p>
      <h2>Contact</h2>
      <p>Questions? Reach us at privacy@gevon.tech.</p>
    </article>
  );
}
