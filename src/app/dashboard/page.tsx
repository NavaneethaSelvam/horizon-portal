
"use client";

import { useEffect, useState } from "react";

type User = {
  username: string;
  name: string | null;
  employeeId: string | null;
  role: string | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          window.location.href = "/login";
          return;
        }

        const result = await response.json();
        setUser(result.user);
      } catch {
        setError("Unable to load your profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadUser();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading your dashboard...
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8 text-red-600">
        {error}
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Aura Workforce
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Welcome, {user.name || user.username}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your employee portal
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            Logout
          </button>
        </header>

        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Employee name</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {user.name || "Not available"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Employee ID</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {user.employeeId || "Not available"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm sm:col-span-2">
            <p className="text-sm text-slate-500">Your role</p>
            <p className="mt-2 text-xl font-bold text-blue-700">
              {user.role}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Your portal access is associated with this account role.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
