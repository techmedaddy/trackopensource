import Link from "next/link";

export const metadata = {
  title: "Persona Analyzer | Open Source Radar",
  description: "Discover your engineering archetype.",
};

export default function PersonaComingSoonPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-neutral-900">
          We're working on it! 🚀
        </h1>
        <p className="text-lg md:text-xl text-neutral-500 mb-10 leading-relaxed">
          The Persona Analyzer is currently under construction. Soon, you'll be able to instantly recalculate the entire dashboard based on your unique engineering archetype and technology taste.
        </p>
        
        <Link 
          href="/" 
          className="px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold tracking-wide shadow-sm hover:bg-indigo-700 transition-colors inline-block"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
