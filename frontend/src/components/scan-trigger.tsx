"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export function ScanTrigger({ lastScanAt }: { lastScanAt?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const { getToken } = useAuth();
  const [timeAgo, setTimeAgo] = useState<string | null>(null);

  useEffect(() => {
    if (!lastScanAt) {
      setTimeAgo(null);
      return;
    }
    
    const updateTimeAgo = () => {
      const date = new Date(lastScanAt);
      const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) setTimeAgo('Just now');
      else if (diffInSeconds < 120) setTimeAgo('1 minute ago');
      else if (diffInSeconds < 3600) setTimeAgo(`${Math.floor(diffInSeconds / 60)} minutes ago`);
      else if (diffInSeconds < 7200) setTimeAgo('1 hour ago');
      else if (diffInSeconds < 86400) setTimeAgo(`${Math.floor(diffInSeconds / 3600)} hours ago`);
      else if (diffInSeconds < 172800) setTimeAgo('1 day ago');
      else setTimeAgo(`${Math.floor(diffInSeconds / 86400)} days ago`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [lastScanAt]);

  const triggerScan = async () => {
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      let token = await getToken();
      if (!token && process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true') {
        token = "mock-clerk-jwt-token";
      }

      const response = await fetch(`/api/trigger`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.error || "Failed to trigger scan.");
      } else {
        setMessage("Scan triggered. Please wait a few moments.");
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      setIsError(true);
      setMessage("Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={triggerScan}
        disabled={isLoading}
        title={timeAgo ? `Last scan: ${timeAgo}` : undefined}
        className="flex h-8 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
      >
        <svg 
          className={`h-3.5 w-3.5 text-neutral-400 ${isLoading ? 'animate-spin' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{isLoading ? "Queuing..." : "Trigger Scan"}</span>
      </button>

      {message && (
        <div className={`absolute top-full mt-1.5 right-0 p-2 pr-6 border rounded w-56 break-words text-xs font-medium z-10 ${isError ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
          <p>{message}</p>
          <button 
            onClick={() => setMessage("")}
            className={`absolute top-1 right-1 p-1 hover:bg-black/5 rounded ${isError ? "text-red-700" : "text-green-700"}`}
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
