module Admin
  module Concerns
    # Shared bulk-destroy behavior for admin index pages. Controllers
    # include this and call `bulk_destroy_for(Model, scope: nil)` from
    # their #bulk_destroy action. `scope` lets the agents/templates
    # controllers wrap in `ActsAsTenant.without_tenant` (passed as a
    # callable).
    module BulkDestroyable
      extend ActiveSupport::Concern

      class_methods do
        # Configures the model + protective callback for this controller.
        #   include BulkDestroyable
        #   bulk_destroyable AgentTemplate, tenant_bypass: true
        def bulk_destroyable(model_class, tenant_bypass: false, guard: nil)
          define_method(:bulk_destroy_target_model) { model_class }
          define_method(:bulk_destroy_tenant_bypass?) { tenant_bypass }
          define_method(:bulk_destroy_guard) { guard }
        end
      end

      def bulk_destroy
        select_all = ActiveModel::Type::Boolean.new.cast(params[:select_all])
        ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
        if !select_all && ids.empty?
          return redirect_back(fallback_location: request.referer, alert: "No items selected")
        end

        model = bulk_destroy_target_model
        guard = bulk_destroy_guard
        scope_block = bulk_destroy_tenant_bypass? ? proc { |&b| ActsAsTenant.without_tenant(&b) } : proc { |&b| b.call }

        destroyed = 0
        protected_count = 0
        scope_block.call do
          # When select_all is set, controllers narrow the dataset via
          # `bulk_destroy_filter_scope` (search/category from the index).
          # Otherwise we use the explicit ids from the per-page checkboxes.
          target_scope = if select_all
            respond_to?(:bulk_destroy_filter_scope, true) ? bulk_destroy_filter_scope(model) : model.all
          else
            model.where(id: ids)
          end

          target_scope.find_each do |record|
            if guard && !guard.call(record, current_user)
              protected_count += 1
              next
            end
            # Snapshot identity for the audit log before destroy nils
            # out the loaded attrs.
            record_admin_destroy(record, action: "admin_bulk_destroy")
            record.destroy
            destroyed += 1
          end
        end

        msg = "Deleted #{destroyed} #{model.name.demodulize.pluralize.downcase}"
        msg += " · #{protected_count} protected (skipped)" if protected_count.positive?
        redirect_back(fallback_location: request.referer, notice: msg)
      end
    end
  end
end
