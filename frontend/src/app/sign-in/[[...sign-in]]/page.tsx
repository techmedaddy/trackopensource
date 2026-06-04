import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left Branding Side - Hidden on Mobile */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-green-900 overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-green-800 opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 h-[40rem] w-[40rem] translate-x-1/3 translate-y-1/3 rounded-full bg-green-600 opacity-40 blur-3xl"></div>
          
          <div className="relative z-10 flex h-full flex-col p-12 lg:p-20">
            <Link href="/" className="group block w-fit">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-green-400 transition group-hover:text-green-300">
                Momentum dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Track OpenSource
              </h1>
            </Link>

            {/* Pure SVG/HTML Recreated Logo (No Background Square!) */}
            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center">
                {/* SVG Radar Icon */}
                <svg width="140" height="140" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M 70 10 A 50 50 0 0 0 70 110" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                  <path d="M 70 28 A 32 32 0 0 0 70 92" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                  <path d="M 70 46 A 14 14 0 0 0 70 74" stroke="white" strokeWidth="7" strokeLinecap="round"/>
                  <circle cx="95" cy="60" r="10" fill="#22c55e" />
                </svg>
                
                {/* Logo Text */}
                <div className="flex flex-col ml-4 justify-center">
                  <span className="text-4xl font-bold leading-[0.95] text-white tracking-tight">TRACK</span>
                  <span className="text-4xl font-bold leading-[0.95] text-white tracking-tight">OPEN</span>
                  <span className="text-4xl font-bold leading-[0.95] text-green-500 tracking-tight">SOURCE</span>
                  <span className="text-sm text-neutral-300 mt-2 tracking-wide font-medium">Discover GitHub Trends</span>
                </div>
              </div>
            </div>
            
            <div className="mt-auto max-w-xl text-white">
              <h2 className="text-3xl font-semibold leading-tight">
                Discover the next generation of breakout repositories before they trend.
              </h2>
              <p className="mt-4 text-lg text-green-100">
                Track open source momentum and developer activity across GitHub, Hacker News, and Reddit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sign-in Side */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-[32rem] xl:w-[40rem]">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="lg:hidden mb-8">
             <Link href="/" className="group block w-fit">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-green-700">
                Momentum dashboard
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Open Source Radar
              </h1>
            </Link>
          </div>
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: "bg-green-700 hover:bg-green-800 text-sm normal-case",
                card: "shadow-none border border-neutral-200",
                headerTitle: "text-neutral-900",
                headerSubtitle: "text-neutral-500"
              }
            }} 
          />
        </div>
      </div>
    </div>
  );
}
