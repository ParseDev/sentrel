import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowRight } from "lucide-react"

import { AuthLayout } from "@/layouts/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  userSessionPath,
  newUserRegistrationPath,
  newUserPasswordPath,
} from "@/routes"

export default function SessionNew() {
  const { data, setData, post, processing } = useForm({
    user: { email: "", password: "" },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(userSessionPath())
  }

  return (
    <>
      <Head title="Sign in" />
      <AuthLayout
        eyebrow="Sign in"
        title="Welcome back."
        description="Sign in to manage your agents, approvals, and runs."
        footer={
          <>
            Don't have an account?{" "}
            <Link
              href={newUserRegistrationPath()}
              className="font-medium text-[var(--color-indigo)] hover:underline"
            >
              Create one
            </Link>
          </>
        }
      >
        <div className="space-y-5">
          <GoogleSignInButton label="Sign in with Google" />
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={data.user.email}
              onChange={(e) => setData("user", { ...data.user, email: e.target.value })}
              required
              autoFocus
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href={newUserPasswordPath()}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={data.user.password}
              onChange={(e) => setData("user", { ...data.user, password: e.target.value })}
              required
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            className="h-10 w-full gap-1.5"
            disabled={processing}
          >
            {processing ? "Signing in…" : (
              <>
                Sign in <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </form>
      </AuthLayout>
    </>
  )
}
