import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Gevon BusinessOS" },
      { name: "description", content: "The terms governing your use of Gevon BusinessOS." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1 className="font-display">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        By creating an account you agree to use Gevon BusinessOS in compliance with applicable laws
        and the responsibilities set out below.
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for maintaining the confidentiality of your credentials and for the
        activity of members you invite to your companies.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don't use Gevon to violate laws, infringe rights, or overwhelm our infrastructure.
      </p>
      <h2>Availability</h2>
      <p>
        We work to keep the service reliable but do not warrant uninterrupted availability during the
        preview period.
      </p>
      <h2>Contact</h2>
      <p>legal@gevon.tech</p>
    </article>
  );
}
