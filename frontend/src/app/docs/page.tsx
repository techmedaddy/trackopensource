import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-tight">
        Documentation
      </h1>
      <p className="text-neutral-500 text-sm max-w-md text-center leading-relaxed mb-8">
        We are currently writing the comprehensive technical<br />
        documentation for the platform. Check back soon!
      </p>
      
      <Link 
        href="/"
        className="px-4 py-2 border border-neutral-200 rounded-full text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors flex items-center gap-2"
      >
        <span>&larr;</span> Back to Dashboard
      </Link>
    </div>
  );
}
