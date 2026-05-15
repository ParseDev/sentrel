import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowRight } from "lucide-react"

import { AuthLayout } from "@/layouts/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userPasswordPath, newUserSessionPath } from "@/routes"

export default function PasswordNew() {
  const { data, setData, post, processing } = useForm({
    user: { email: "" },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(userPasswordPath())
  }

  return (
    <>
      <Head title="Reset password" />
      <AuthLayout
        eyebrow="Reset password"
        title="Forgot your password?"
        description="Enter your email and we'll send you a link to set a new one."
        footer={
          <>
            Remembered it?{" "}
            <Link
              href={newUserSessionPath()}
              className="font-medium text-[var(--color-indigo)] hover:underline"
            >
              Back to sign in
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={data.user.email}
              onChange={(e) => setData("user", { email: e.target.value })}
              required
              autoFocus
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            className="h-10 w-full gap-1.5"
            disabled={processing}
          >
            {processing ? "Sending…" : (
              <>
                Send reset link <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </form>
      </AuthLayout>
    </>
  )
}
