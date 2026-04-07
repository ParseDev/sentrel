class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [:show, :update, :destroy]

  def index
    render inertia: "tasks/index", props: {
      tasks: current_tenant.tasks.includes(:agent, :assigned_by_user, :assigned_by_agent)
        .order(created_at: :desc).map { |t| task_json(t) },
      agents: current_tenant.agents.select(:id, :name, :slug).as_json(only: [:id, :name, :slug])
    }
  end

  def show
    render inertia: "tasks/show", props: { task: task_json(@task) }
  end

  def create
    task = current_tenant.tasks.build(task_params)
    task.assigned_by_user = current_user

    if task.save
      redirect_to tasks_path, notice: "Task created"
    else
      redirect_back fallback_location: tasks_path, alert: task.errors.full_messages.join(", ")
    end
  end

  def update
    if @task.update(task_params)
      redirect_to tasks_path, notice: "Task updated"
    else
      redirect_back fallback_location: tasks_path, alert: @task.errors.full_messages.join(", ")
    end
  end

  def destroy
    @task.destroy
    redirect_to tasks_path, notice: "Task deleted"
  end

  private

  def set_task
    @task = current_tenant.tasks.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:agent_id, :title, :description, :instruction, :status, :priority, :due_at)
  end

  def task_json(task)
    task.as_json(only: [:id, :title, :description, :instruction, :status, :priority, :due_at, :started_at, :completed_at, :created_at]).merge(
      agent: task.agent.as_json(only: [:id, :name, :slug]),
      assigned_by: task.assigned_by_user&.as_json(only: [:id, :name]) || task.assigned_by_agent&.as_json(only: [:id, :name])
    )
  end
end
