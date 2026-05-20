module Admin
  # Base controller for everything under /admin/*. Two gates:
  #   1. authenticate_user! (Devise) — must be logged in.
  #   2. require_admin!     — role must be owner or admin.
  # Non-admin users get redirected to root with a flash. We don't reveal
  # the existence of admin routes (no 404 vs 403 differentiation) since
  # the nav link is only shown to admins on the React side anyway.
  class BaseController < ApplicationController
    before_action :authenticate_user!
    before_action :require_admin!

    private

    def require_admin!
      return if current_user&.admin?
      redirect_to root_path, alert: "Admin access required."
    end
  end
end
