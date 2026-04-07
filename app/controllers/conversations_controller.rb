class ConversationsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_agent

  def index
    conversations = @agent.conversations.order(updated_at: :desc)
    conversations = conversations.where(kind: params[:kind]) if params[:kind].present?

    render inertia: "conversations/index", props: {
      agent: @agent.as_json(only: [:id, :name, :slug, :role]),
      conversations: conversations.map { |c|
        c.as_json(only: [:id, :kind, :contact_name, :contact_email, :contact_phone, :subject, :status, :updated_at]).merge(
          message_count: c.messages.count,
          last_message: c.messages.order(created_at: :desc).first&.as_json(only: [:content, :role, :channel, :created_at])
        )
      }
    }
  end

  def show
    conversation = @agent.conversations.find(params[:id])

    render inertia: "conversations/show", props: {
      agent: @agent.as_json(only: [:id, :name, :slug, :role]),
      conversation: conversation.as_json(only: [:id, :kind, :contact_name, :contact_email, :contact_phone, :subject, :status]),
      messages: conversation.messages.order(created_at: :asc).as_json(
        only: [:id, :role, :content, :direction, :channel, :tool_calls, :metadata, :created_at]
      )
    }
  end

  private

  def set_agent
    @agent = current_tenant.agents.find(params[:agent_id])
  end
end
