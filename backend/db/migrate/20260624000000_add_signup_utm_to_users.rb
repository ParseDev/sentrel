class AddSignupUtmToUsers < ActiveRecord::Migration[8.0]
  def change
    # First-touch marketing attribution captured at signup (utm_source/medium/
    # campaign/term/content, plus gclid/referrer/landing_path when present).
    # Populated from a first-touch cookie set on landing, so it survives
    # navigation and the Google OAuth round-trip.
    add_column :users, :signup_utm, :jsonb, null: false, default: {}
  end
end
