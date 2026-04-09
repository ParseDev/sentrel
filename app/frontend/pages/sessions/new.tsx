import { Head, Link, useForm } from "@inertiajs/react"
import { Bot, Zap, Shield, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userSessionPath, newUserRegistrationPath } from "@/routes"

export default function SessionNew() {
  const { data, setData, post, processing } = useForm({
    user: {
      email: "",
      password: "",
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post(userSessionPath())
  }

  return (
    <>
      <Head title="Sign in" />
      <div className="flex min-h-screen bg-[#0f0f0f]">
        {/* Left: Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/[0.06]">
          <div>
            <span className="text-2xl font-medium tracking-tight text-white">ALCHEMY<span className="text-[#00ffff]">.</span></span>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-normal tracking-tight leading-[0.9] mb-4 text-white">
                Your AI team,<br />
                <span className="text-[#00ffff]">ready to work.</span>
              </h1>
              <p className="text-[rgba(255,255,255,0.5)] text-lg max-w-md">
                Create AI employees with their own email, phone, and Slack. They work autonomously, collaborate as a team, and report to you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Bot, title: "Any Role", desc: "SDR, engineer, finance, content" },
                { icon: Zap, title: "Always On", desc: "Heartbeat checks, 24/7 execution" },
                { icon: Shield, title: "You Control", desc: "Auto-send or draft for approval" },
                { icon: Users, title: "Team Play", desc: "Agents delegate and collaborate" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-3.5 rounded border border-white/[0.06] bg-white/[0.02]">
                  <Icon className="size-4 text-[#00ffff] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-white">{title}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.4)]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-[rgba(255,255,255,0.3)]">Alchemy — Turn effort into outcome</p>
        </div>

        {/* Right: Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="lg:hidden mb-8 text-center">
              <span className="text-2xl font-medium tracking-tight text-white">ALCHEMY<span className="text-[#00ffff]">.</span></span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-normal tracking-tight text-white">Welcome back</h2>
              <p className="text-[rgba(255,255,255,0.5)] mt-1">Sign in to manage your AI team</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={data.user.password}
                  onChange={(e) => setData("user", { ...data.user, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={processing}>
                {processing ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-[rgba(255,255,255,0.4)]">
              Don't have an account?{" "}
              <Link href={newUserRegistrationPath()} className="text-[#00ffff] hover:text-[#00e0e0] font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
