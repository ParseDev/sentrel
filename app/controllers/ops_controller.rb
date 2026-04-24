class OpsController < ApplicationController
  before_action :authenticate_user!

  # POST /ops/roll_engine
  # Kicks off a rolling update of every running agent in the current org
  # to the latest engine image (or the one passed in params[:image]).
  def roll_engine
    org_id = current_user.organization_id
    RollEngineUpdateJob.perform_later(
      image: params[:image].presence,
      organization_id: org_id,
    )
    render json: { ok: true, message: "Rolling update queued" }
  end
end
