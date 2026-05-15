import { Head, Link, useForm } from "@inertiajs/react"
import { ArrowRight } from "lucide-react"

import { AuthLayout } from "@/layouts/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userPasswordPath, newUserSessionPath } from "@/routes"

interface PasswordEditProps {
  reset_password_token: string
}

export default function PasswordEdit({ reset_password_token }: PasswordEditProps) {
  const { data, setData, put, processing } = useForm({
    user: {
      reset_password_token,
      password: "",
      password_confirmation: "",
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    put(userPasswordPath())
  }

  return (
    <>
      <Head title="Set new password" />
      <AuthLayout
        eyebrow="New password"
        title="Pick a new password."
        description="Make sure it's something only you can guess."
        footer={
          <>
            Changed your mind?{" "}
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
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={data.user.password}
              onChange={(e) =>
                setData("user", { ...data.user, password: e.target.value })
              }
              required
              autoFocus
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm password</Label>
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
          <Button
            type="submit"
            className="h-10 w-full gap-1.5"
            disabled={processing}
          >
            {processing ? "Saving…" : (
              <>
                Set new password <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </form>
      </AuthLayout>
    </>
  )
}
