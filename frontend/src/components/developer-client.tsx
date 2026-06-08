"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function DeveloperClient() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <div className="p-8 text-neutral-500">Loading...</div>;

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-neutral-100 p-3">
          <svg className="h-6 w-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Sign in required</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-sm">
          You must be signed in to view developer settings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition">
              &larr; Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Developer API</h1>
        </div>
        <UserButton />
      </header>

      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 px-8 py-16 text-center shadow-sm">
        {/* Decorative background elements */}
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-teal-200/40 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Enterprise API Access
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600">
            We are putting the final touches on our developer platform. Soon, you will be able to generate API keys to programmatically query our open-source intelligence pipeline.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-inset ring-emerald-200">
              Coming Soon
            </span>
          </div>
          <p className="mt-6 text-sm text-neutral-500">
            Flexible pricing plans and high-throughput endpoints are on the way.
          </p>
        </div>
      </div>
    </div>
  );
}
