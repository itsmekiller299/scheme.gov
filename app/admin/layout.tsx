"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/applications", label: "Applications", icon: "📄" },
  { href: "/admin/grievances", label: "Grievances", icon: "⚠️" },
  { href: "/admin/customer-service", label: "Customer Service", icon: "🎧" },
  { href: "/admin/schemes", label: "Schemes", icon: "🏛️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.user || (d.user.role !== "admin" && d.user.role !== "staff")) {
          router.push("/login?next=/admin");
        } else {
          setUser(d.user);
        }
      })
      .catch(() => router.push("/login?next=/admin"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="p-8 text-sm text-zinc-500">Checking admin access…</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-4 border-b">
          <p className="text-sm font-bold">Admin Panel</p>
          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-black text-white capitalize">{user.role}</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${active ? "bg-black text-white" : "hover:bg-zinc-100 text-zinc-700"}`}
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t space-y-2">
          <Link href="/customer-service" className="block text-xs text-center text-zinc-500 hover:text-black">→ Customer Service (User)</Link>
          <Link href="/" className="block text-xs text-center text-zinc-500 hover:text-black">← Back to Home</Link>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex overflow-x-auto z-10">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`flex-1 text-center py-2 text-xs ${pathname === item.href ? "bg-black text-white" : "text-zinc-600"}`}>
            <div>{item.icon}</div>{item.label}
          </Link>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-6xl w-full">{children}</main>
    </div>
  );
}
