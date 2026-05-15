# Load each file under db/seeds/. Files are idempotent — safe to rerun.
Dir[Rails.root.join("db/seeds/*.rb")].sort.each { |f| load f }
