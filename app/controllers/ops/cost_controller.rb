class Ops::CostController < ApplicationController
  before_action :authenticate_user!

  # GET /ops/cost
  # Daily cost breakdown per agent for the org. Shows how much each agent
  # is costing us, trends over time, and which tools dominate the bill.
  def index
    days = (params[:days].presence || 30).to_i.clamp(1, 365)
    since = days.days.ago

    logs = current_tenant.audit_logs.where("created_at >= ?", since)

    # Daily series
    daily = logs.group("DATE(created_at)")
                .group(:agent_id)
                .sum(:total_cost_usd)
                .transform_values { |v| v.to_f.round(6) }
                .map { |(date, agent_id), cost| { date: date, agent_id: agent_id, cost: cost } }

    # Totals per agent
    per_agent = logs.group(:agent_id).sum(:total_cost_usd)
                    .transform_values { |v| v.to_f.round(4) }

    # Totals per job type
    per_job_type = logs.group(:action).sum(:total_cost_usd)
                       .transform_values { |v| v.to_f.round(4) }

    # Per-model breakdown: cost + input/output tokens per LLM model
    model_costs  = logs.group(:model_id).sum(:total_cost_usd)
    model_input  = logs.group(:model_id).sum(:input_tokens)
    model_output = logs.group(:model_id).sum(:output_tokens)
    per_model = model_costs.keys.map do |model_id|
      input  = model_input[model_id].to_i
      output = model_output[model_id].to_i
      {
        model_id: model_id.presence || "(unknown)",
        cost: model_costs[model_id].to_f.round(4),
        input_tokens: input,
        output_tokens: output,
        total_tokens: input + output,
      }
    end

    # Cache savings estimate (what we would have paid without cache reads)
    cache_read_total = logs.sum(:cache_read_input_tokens).to_i
    # Assume 90% discount on cache reads (Sonnet: $3/M full, $0.30/M cached)
    cache_savings = (cache_read_total * 2.70 / 1_000_000.0).round(4)

    total_input  = logs.sum(:input_tokens).to_i
    total_output = logs.sum(:output_tokens).to_i

    render inertia: "ops/cost/index", props: {
      days: days,
      total_cost_usd: logs.sum(:total_cost_usd).to_f.round(4),
      total_runs: logs.count,
      total_tokens: total_input + total_output,
      total_input_tokens: total_input,
      total_output_tokens: total_output,
      cache_savings_usd: cache_savings,
      cache_read_tokens: cache_read_total,
      daily: daily,
      per_agent: per_agent.map { |aid, cost| {
        agent_id: aid,
        agent_name: current_tenant.agents.find_by(id: aid)&.name,
        cost: cost,
      } },
      per_job_type: per_job_type.map { |action, cost| { action: action, cost: cost } },
      per_model: per_model,
    }
  end
end
