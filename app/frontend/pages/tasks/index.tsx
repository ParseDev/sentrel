import { Head, useForm, router } from "@inertiajs/react"
import { Plus, CheckSquare, GripVertical } from "lucide-react"

import AppLayout from "@/layouts/app-layout"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

const columns = [
  { key: "todo", label: "To Do", color: "bg-stone-400" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { key: "done", label: "Done", color: "bg-green-500" },
  { key: "failed", label: "Failed", color: "bg-red-500" },
] as const

const priorityStyles: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  normal: "border-l-stone-300",
  low: "border-l-stone-200",
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

  if (tasks.length === 0 && agents.length === 0) {
    return (
      <AppLayout>
        <Head title="Tasks" />
        <PageHeader title="Tasks" description="Assign and track work across your agents" />
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create agents first, then assign them tasks"
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title="Tasks" />

      <PageHeader
        title="Tasks"
        description="Assign and track work across your agents"
        action={
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
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={data.title} onChange={(e) => setData("title", e.target.value)} placeholder="Research top competitors" required />
                </div>
                <div className="space-y-2">
                  <Label>Instruction</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Detailed instructions for the agent..."
                    value={data.instruction}
                    onChange={(e) => setData("instruction", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={data.priority} onValueChange={(v) => setData("priority", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={processing}>Create Task</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-4 gap-5">
        {columns.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className={`size-2 rounded-full ${col.color}`} />
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{columnTasks.length}</span>
              </div>

              <div className="space-y-3 min-h-[200px] bg-muted/30 rounded-xl p-3">
                {columnTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No tasks</p>
                )}
                {columnTasks.map((task) => (
                  <Card key={task.id} className={`border-l-4 ${priorityStyles[task.priority]}`}>
                    <CardContent className="py-3 px-4">
                      <p className="font-medium text-sm leading-snug">{task.title}</p>

                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {task.agent.name[0]}
                        </div>
                        <span className="text-xs text-muted-foreground">{task.agent.name}</span>
                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                          {task.priority}
                        </Badge>
                      </div>

                      {(col.key === "todo" || col.key === "in_progress") && (
                        <div className="mt-3 pt-3 border-t flex gap-2">
                          {col.key === "todo" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => updateStatus(task.id, "in_progress")}
                            >
                              Start
                            </Button>
                          )}
                          {col.key === "in_progress" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={() => updateStatus(task.id, "done")}
                            >
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
