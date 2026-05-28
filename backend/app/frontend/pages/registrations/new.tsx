import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowRight } from "lucide-react"

import { AuthLayout } from "@/layouts/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userRegistrationPath, newUserSessionPath } from "@/routes"

export default function RegistrationNew() {
  const { data, setData, post, processing } = useForm({
    user: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      organization_name: "",
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(userRegistrationPath())
  }

  return (
    <>
      <Head title="Sign up" />
      <AuthLayout
        eyebrow="Create account"
        title="Build your AI team."
        description="Set up your workspace, add agents, connect tools. 90 seconds."
        footer={
          <>
            Already have an account?{" "}
            <Link
              href={newUserSessionPath()}
              className="font-medium text-[var(--color-indigo)] hover:underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <GoogleSignInButton label="Sign up with Google" />
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization_name">Organization</Label>
            <Input
              id="organization_name"
              placeholder="Acme Inc."
              value={data.user.organization_name}
              onChange={(e) =>
                setData("user", { ...data.user, organization_name: e.target.value })
              }
              required
              autoFocus
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="Priya Shah"
              value={data.user.name}
              onChange={(e) => setData("user", { ...data.user, name: e.target.value })}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={data.user.email}
              onChange={(e) => setData("user", { ...data.user, email: e.target.value })}
              required
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={data.user.password}
                onChange={(e) =>
                  setData("user", { ...data.user, password: e.target.value })
                }
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Confirm</Label>
              <Input
                id="password_confirmation"
                type="password"
                placeholder="••••••••"
                value={data.user.password_confirmation}
                onChange={(e) =>
                  setData("user", {
                    ...data.user,
                    password_confirmation: e.target.value,
                  })
                }
                required
                className="h-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="mt-2 h-10 w-full gap-1.5"
            disabled={processing}
          >
            {processing ? "Creating account…" : (
              <>
                Create account <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>

          <p className="pt-1 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            By continuing, you agree to the Terms + Privacy policy
          </p>
        </form>
      </AuthLayout>
    </>
  )
}
