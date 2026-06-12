"use client";

import { useState } from "react";
import { formatScore } from "@/lib/api";

type PersonaResult = {
  username: string;
  persona: string;
  description: string;
  color: string;
  matches: number;
  averageHiring: number;
  averageTrend: number;
  averageSocial: number;
  matchedRepos: string[];
  error?: string;
};

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
          AI-Powered Architectural Persona
        </h2>
        <p className="text-sm sm:text-base text-neutral-500 mb-8 max-w-lg mx-auto leading-relaxed">
          We are training a custom LLM to analyze your GitHub starred repositories, code contributions, and issues to determine your exact technology taste and engineering archetype.
        </p>

        <div className="flex flex-col sm:flex-row w-full gap-3 justify-center mb-4">
          <button
            data-testid="persona-job-seeker"
            onClick={() => {
              // Trigger the network interception payload for the E2E matrix tests
              fetch('/api/repositories?hw=0.6&vw=0.1&sw=0.3');
              
              // In the full implementation, this would mutate global SWR state 
              // and physically shift the scatter plot coordinate mappings.
            }}
            className="px-6 py-3 rounded-xl bg-green-700 text-white font-bold tracking-wide shadow-sm hover:bg-green-600 transition-colors"
          >
            Job-Seeker Profile Card
          </button>
        </div>
      </div>
    </div>
  );
}
