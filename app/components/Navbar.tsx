"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

type User = { email: string; role?: string; loggedInAt: string };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  const readUser = React.useCallback(async () => {
    // Prefer server cookie via /api/auth/me, fallback to localStorage for transition
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser({ email: data.user.email, role: data.user.role, loggedInAt: new Date().toISOString() });
          setRole(data.user.role || "user");
          // keep localStorage in sync for legacy UI
          localStorage.setItem("welfare_user", JSON.stringify({ email: data.user.email, id: data.user.id, role: data.user.role }));
          return;
        }
      }
    } catch {}
    try {
      const raw = localStorage.getItem("welfare_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        setRole(parsed.role || null);
      } else {
        setUser(null);
        setRole(null);
      }
    } catch {
      setUser(null);
      setRole(null);
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
    readUser();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "welfare_user") readUser();
    };
    const onCustom = () => readUser();

    window.addEventListener("storage", onStorage);
    window.addEventListener("welfare_auth_changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("welfare_auth_changed", onCustom);
    };
  }, [readUser]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("welfare_user");
    localStorage.removeItem("welfare_remember");
    window.dispatchEvent(new Event("welfare_auth_changed"));
    setUser(null);
    setRole(null);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  const authSection =
    mounted && user ? (
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-sm text-zinc-600 max-w-[160px] truncate">
          {user.email} {role && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-white capitalize">{role}</span>}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 rounded-lg border bg-white hover:bg-zinc-50 transition-colors"
        >
          Logout
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <Link
          href="/register"
          className={`hidden sm:inline-flex text-sm px-4 py-2 rounded-lg border transition-colors ${
            isActive("/register") ? "bg-zinc-900 text-white border-zinc-900" : "bg-white hover:bg-zinc-50"
          }`}
        >
          Create account
        </Link>
        <Link
          href="/login"
          className={`text-sm px-5 py-2 rounded-lg font-medium transition-colors ${
            isActive("/login")
              ? "bg-zinc-900 text-white"
              : "bg-black text-white hover:bg-zinc-800"
          }`}
        >
          Login
        </Link>
      </div>
    );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 h-[60px] flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-black text-white grid place-items-center text-sm font-bold">
            W
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-bold tracking-tight">Welfare Scheme</p>
            <p className="text-[11px] text-zinc-500 -mt-0.5">AI Welfare • सरकार</p>
          </div>
        </Link>

        {/* Center: Nav links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              isActive("/") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"
            }`}
          >
            Home
          </Link>
          <Link
            href="/applications"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors hidden sm:inline-flex ${
              isActive("/applications") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"
            }`}
          >
            Applications
          </Link>
          <Link
            href="/grievance"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              isActive("/grievance") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"
            }`}
          >
            Grievance
          </Link>
          <Link
            href="/customer-service"
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              isActive("/customer-service") ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"
            }`}
          >
            Help
          </Link>
          {(role === "admin" || role === "staff") && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname.startsWith("/admin") ? "bg-black text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right: Auth */}
        {authSection}
      </div>
    </nav>
  );
}
