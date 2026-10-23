
"use client";

import { useEffect, useState } from "react";

type User = {
  username: string;
  name: string | null;
  employeeId: string | null;
  role: string | null;
};

export function DashboardWelcome() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result.user ?? null);
        }
      } catch (error) {
        console.error("Unable to load dashboard user", error);
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, []);

  if (loading) {
    return (
      <div className="mt-2 h-9 w-64 animate-pulse rounded bg-primary-soft" />
    );
  }

  const displayName = user?.name || user?.username;

  return (
    <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
      {displayName
        ? `Welcome, ${displayName} 👋`
        : "Welcome to your workspace 👋"}
    </h1>
  );
}
