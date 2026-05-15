# Models that have `has_prefix_id` should emit the prefixed id in as_json /
# Inertia props, not the raw bigint. Mix this concern in after has_prefix_id
# to swap `id` for the encoded `to_param` in JSON serialization.
module PublicIdSerialization
  extend ActiveSupport::Concern

  def as_json(options = {})
    super(options).tap do |h|
      if h.is_a?(Hash) && h.key?("id")
        h["id"] = to_param
      end
    end
  end
end
