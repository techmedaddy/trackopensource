"use client";

import { useState } from "react";

export function PersonaAnalyzer() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="w-full h-full bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col items-start text-left">
        {/* Subtle Background Gradient */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-indigo-50/80 rounded-full blur-3xl opacity-70 pointer-events-none" />
        
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 tracking-widest uppercase mb-4 shadow-sm border border-indigo-100">
            Experimental
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 mb-3">
            Discover Your Developer Archetype
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 mb-8 leading-relaxed">
            We analyze your GitHub history, language preferences, contribution patterns, and repository activity to identify your engineering archetype.
          </p>

          {/* Archetype Preview Row */}
          <div className="flex items-start gap-6 sm:gap-10 mb-8">
            <button onClick={() => setIsModalOpen(true)} className="group flex flex-col items-center gap-3 w-16 sm:w-20">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100/50">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors text-center leading-tight">Systems Architect</span>
            </button>
            <button onClick={() => setIsModalOpen(true)} className="group flex flex-col items-center gap-3 w-16 sm:w-20">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100/50">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v8l9-11h-7z" /></svg>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors text-center leading-tight">Builder</span>
            </button>
            <button onClick={() => setIsModalOpen(true)} className="group flex flex-col items-center gap-3 w-16 sm:w-24">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100/50">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors text-center leading-tight">Maintainer</span>
            </button>
            <button onClick={() => setIsModalOpen(true)} className="group flex flex-col items-center gap-3 w-16 sm:w-20">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100/50">
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors text-center leading-tight">Researcher</span>
            </button>
          </div>

          <div className="mb-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium tracking-wide shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Discover My Archetype &rarr;
            </button>
          </div>

          <div className="mt-auto pt-5 border-t border-neutral-100 w-full">
            <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Sample Result</h4>
            <div className="bg-neutral-50/50 border border-neutral-100 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">🏗</span>
                  <span className="text-[14px] font-bold text-neutral-900">Systems Architect</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Confidence: 87%</span>
              </div>
              
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Top Languages</span>
                <span className="text-[12px] font-medium text-neutral-700">Rust &bull; Go &bull; TypeScript</span>
              </div>
              
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Strengths</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <span className="text-[11px] font-medium text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded-md shadow-sm">System Design</span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded-md shadow-sm">Infrastructure</span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded-md shadow-sm">Long-Term Maintenance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Developer Archetypes</h3>
              <p className="text-xs font-semibold tracking-wide text-indigo-700 mb-4 bg-indigo-50 inline-block px-2.5 py-1 rounded-md border border-indigo-100">
                This feature is currently in development.
              </p>
              <p className="text-sm text-neutral-600 mb-5 leading-relaxed">
                Soon you'll be able to view your deep engineering archetype based on open source history:
              </p>
              <ul className="text-sm text-neutral-700 space-y-3 mb-8 ml-2 text-left">
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Systems Architect</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Research Engineer</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Builder</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Open Source Maintainer</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Founder Engineer</li>
                <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Infrastructure Engineer</li>
              </ul>
              <div className="flex justify-end pt-4 border-t border-neutral-100">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
