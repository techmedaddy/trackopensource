"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

export function ScanTrigger() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const { getToken } = useAuth();

  const triggerScan = async () => {
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const token = await getToken();
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
        setMessage(data.message || "Scan triggered successfully.");
        // Clear success message after 5 seconds
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
    <div className="flex flex-col items-end justify-center relative">
      <button
        onClick={triggerScan}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Queuing Scan..." : "Trigger Live Scan"}
      </button>
      {message && (
        <div className={`mt-2 p-2 pr-6 border rounded relative w-64 break-words text-xs font-medium ${isError ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
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
