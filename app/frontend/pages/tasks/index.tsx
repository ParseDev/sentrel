import { Head, useForm, router } from "@inertiajs/react"
import { Plus } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tasksPath } from "@/routes"

interface TaskItem {
  id: number
  title: string
  description: string | null
  instruction: string | null
  status: string
  priority: string
  due_at: string | null
  agent: { id: number; name: string; slug: string }
  assigned_by: { id: number; name: string } | null
}

interface Props {
  tasks: TaskItem[]
  agents: { id: number; name: string; slug: string }[]
}

const columns = ["todo", "in_progress", "done", "failed"] as const
const columnLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  failed: "Failed",
}
const priorityColor: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  normal: "text-foreground",
  low: "text-muted-foreground",
}

export default function TasksIndex({ tasks, agents }: Props) {
  const { data, setData, post, processing, reset } = useForm({
    agent_id: "",
    title: "",
    instruction: "",
    priority: "normal",
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    post(tasksPath(), { onSuccess: () => reset() })
  }

  function updateStatus(taskId: number, status: string) {
    router.patch(`/tasks/${taskId}`, { task: { status } }, { preserveScroll: true })
  }

  return (
    <AppLayout>
      <Head title="Tasks" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Assign and track work across your agents</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" />New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={data.agent_id} onValueChange={(v) => setData("agent_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={data.title} onChange={(e) => setData("title", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Instruction</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={data.instruction}
                  onChange={(e) => setData("instruction", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={data.priority} onValueChange={(v) => setData("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={processing}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col)
          return (
            <div key={col}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{columnLabels[col]}</h3>
                <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <Card key={task.id} className="cursor-pointer">
                    <CardContent className="py-3 px-4">
                      <p className={`font-medium text-sm ${priorityColor[task.priority]}`}>{task.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{task.agent.name}</span>
                        <Badge variant="outline" className="text-[10px]">{task.priority}</Badge>
                      </div>
                      {col !== "done" && col !== "failed" && (
                        <div className="flex gap-1 mt-2">
                          {col === "todo" && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => updateStatus(task.id, "in_progress")}>
                              Start
                            </Button>
                          )}
                          {col === "in_progress" && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => updateStatus(task.id, "done")}>
                              Complete
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
