import Link from "next/link";

export const metadata = {
  title: "Documentation | Open Source Radar",
  description: "Documentation is coming soon.",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Documentation
        </h1>
        <p className="text-neutral-500">
          We are currently writing the comprehensive technical documentation for the platform. Check back soon!
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all shadow-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
