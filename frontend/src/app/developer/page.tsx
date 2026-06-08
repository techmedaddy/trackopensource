import { DeveloperClient } from "@/components/developer-client";

export const metadata = {
  title: "Developer Settings - Track OpenSource",
  description: "Manage your programmatic API keys.",
};

export default function DeveloperPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <DeveloperClient />
    </main>
  );
}
