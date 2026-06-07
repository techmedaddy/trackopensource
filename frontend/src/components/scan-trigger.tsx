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
    <div className="flex flex-col items-end justify-center">
      <button
        onClick={triggerScan}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Starting Scan..." : "Trigger Live Scan"}
      </button>
      {message && (
        <p className={`mt-2 text-xs font-medium ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
