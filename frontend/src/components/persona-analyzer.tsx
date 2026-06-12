import Link from "next/link";

export function PersonaAnalyzer() {
  return (
    <div className="w-full bg-white border border-neutral-200 rounded-2xl p-5 sm:p-8 mb-8 sm:mb-10 shadow-sm relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto py-4 sm:py-8">
        <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 tracking-wide uppercase mb-4 shadow-sm border border-indigo-200">
          Coming Soon
        </span>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 mb-4">
          Discover Your Developer Archetype
        </h2>
        <p className="text-sm sm:text-base text-neutral-500 mb-8 max-w-lg mx-auto leading-relaxed">
          Instantly re-calculate the entire dashboard based on what matters to you. Find out if you're a Job Seeker, a VC Investor, or an Enterprise Architect.
        </p>

        <div className="flex flex-col sm:flex-row w-full gap-4 justify-center mb-4">
          <Link
            data-testid="persona-job-seeker"
            href="/persona"
            className="px-8 py-4 rounded-xl bg-green-600 text-white font-bold tracking-wide shadow-sm hover:bg-green-700 transition-colors"
          >
            Check Your Persona
          </Link>
        </div>
      </div>
    </div>
  );
}
