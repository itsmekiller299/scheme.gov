"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setServerError(result.error || "Invalid email or password");
        // Fallback to local mock if DB not reachable (so localhost still works without Mongo)
        if (res.status === 500) {
          console.warn("DB unavailable, using mock login");
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "welfare_user",
              JSON.stringify({ email: data.email, loggedInAt: new Date().toISOString() })
            );
            if (data.remember) localStorage.setItem("welfare_remember", "1");
            window.dispatchEvent(new Event("welfare_auth_changed"));
          }
          router.push("/");
          router.refresh();
          return;
        }
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "welfare_user",
          JSON.stringify({
            email: result.user.email,
            id: result.user.id,
            name: result.user.name,
            loggedInAt: new Date().toISOString(),
          })
        );
        if (data.remember) localStorage.setItem("welfare_remember", "1");
        window.dispatchEvent(new Event("welfare_auth_changed"));
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Login fetch error:", err);
      setServerError("Cannot connect to server. Using offline mock.");
      // Offline mock fallback
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "welfare_user",
          JSON.stringify({ email: data.email, loggedInAt: new Date().toISOString() })
        );
        window.dispatchEvent(new Event("welfare_auth_changed"));
      }
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="flex-1 bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-tighter">Welfare Scheme</h1>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            Multilingual Welfare Scheme Discovery
          </p>
        </div>

        {/* Card */}
        <div className="border rounded-xl p-6 sm:p-8 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to discover schemes you&apos;re eligible for
          </p>

          {/* Demo credentials hint */}
          <div className="mb-6 rounded-lg bg-zinc-50 border px-3 py-2.5 text-xs text-zinc-600">
            <span className="font-medium">Demo:</span> demo@welfare.gov.in / demo123
            <span className="text-zinc-400"> — or use any email/password ≥6 chars</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
                className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-zinc-400"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link href="#" className="text-xs text-zinc-500 hover:text-black hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className="w-full p-2.5 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent placeholder:text-zinc-400"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1.5 rounded-md border bg-white hover:bg-zinc-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("remember")}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Remember me
            </label>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-zinc-500">or</span>
            </div>
          </div>

          <p className="text-sm text-center text-zinc-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-black hover:underline">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          <Link href="/" className="hover:underline">
            ← Back to home
          </Link>
          <span className="mx-2">·</span>
          <Link href="/grievance" className="hover:underline">
            Grievance portal
          </Link>
        </p>
      </div>
    </main>
  );
}
