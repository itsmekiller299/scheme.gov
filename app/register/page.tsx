"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState("");
  const [serverSuccess, setServerSuccess] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError("");
    setServerSuccess("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setServerError(result.error || "Registration failed");
        return;
      }

      // Auto-login after register: save session
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
        window.dispatchEvent(new Event("welfare_auth_changed"));
      }

      setServerSuccess("Account created! Redirecting to home...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    } catch (err) {
      console.error("Register error:", err);
      setServerError("Cannot connect to server. Try again.");
    }
  };

  return (
    <main className="flex-1 bg-background flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-tighter">Welfare Scheme</h1>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Public Customer Service — Create your account</p>
        </div>

        <div className="border rounded-xl p-6 sm:p-8 bg-white shadow-sm">
          <h2 className="text-2xl font-semibold mb-1">Create account</h2>
          <p className="text-sm text-muted-foreground mb-6">
            For public users to check schemes & apply. Free, 30 seconds.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                id="name"
                placeholder="Rajesh Kumar"
                autoComplete="name"
                {...register("name")}
                className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-zinc-400"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1.5">{errors.name.message}</p>}
            </div>

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
                className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-zinc-400"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  className="w-full p-2.5 border rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-black placeholder:text-zinc-400"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2.5 py-1.5 rounded-md border bg-white hover:bg-zinc-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1.5">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("confirmPassword")}
                className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black placeholder:text-zinc-400"
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <p className="text-xs text-red-600 mt-1.5">{errors.confirmPassword.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5">{serverError}</div>
            )}
            {serverSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5">{serverSuccess}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>

            <p className="text-xs text-center text-zinc-500">
              By creating an account you agree to our Terms. Your data is stored securely in MongoDB (<code className="bg-zinc-100 px-1 rounded">users</code> collection).
            </p>
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
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-black hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          <Link href="/" className="hover:underline">
            ← Back to home
          </Link>
          <span className="mx-2">·</span>
          <Link href="/apply/pm-kisan" className="hover:underline">
            Browse schemes
          </Link>
        </p>
      </div>
    </main>
  );
}
