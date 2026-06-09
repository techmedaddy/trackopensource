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
          <input
            type="email"
            disabled
            placeholder="Enter your email to get early access..."
            className="flex-1 max-w-sm px-4 py-3 rounded-xl border border-neutral-300 bg-neutral-50 text-sm opacity-70 cursor-not-allowed"
          />
          <button
            disabled
            className="px-6 py-3 rounded-xl bg-neutral-900 text-white font-bold tracking-wide opacity-70 cursor-not-allowed"
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}
