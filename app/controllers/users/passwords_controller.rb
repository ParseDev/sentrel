class Users::PasswordsController < Devise::PasswordsController
  def new
    render inertia: "passwords/new"
  end

  def create
    self.resource = resource_class.send_reset_password_instructions(resource_params)

    # Always redirect with a generic message to avoid leaking which emails
    # are registered. Devise's default behaviour also obscures this in
    # paranoid mode; we mirror it explicitly here.
    set_flash_message!(:notice, :send_paranoid_instructions)
    redirect_to new_user_session_path
  end

  def edit
    render inertia: "passwords/edit", props: {
      reset_password_token: params[:reset_password_token]
    }
  end

  def update
    self.resource = resource_class.reset_password_by_token(resource_params)

    if resource.errors.empty?
      resource.unlock_access! if unlockable?(resource)
      if Devise.sign_in_after_reset_password
        sign_in(resource_name, resource)
      end
      set_flash_message!(:notice, :updated)
      redirect_to after_sign_in_path_for(resource)
    else
      redirect_to edit_user_password_path(reset_password_token: resource_params[:reset_password_token]),
                  alert: resource.errors.full_messages.join(", ")
    end
  end
end
