import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Back to 1sh
        </Link>
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-black prose-h1:text-4xl prose-h1:mb-2 prose-a:text-foreground prose-a:underline-offset-4 prose-lead:text-muted-foreground">
          {children}
        </article>
      </div>
    </div>
  );
}
