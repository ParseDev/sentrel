# Direct file upload for the mobile app (images, voice notes, files). Stores
# the file as an ActiveStorage blob and returns its signed_id, which the client
# then passes to messages#create as attachment_signed_ids[]. (The web uses
# @rails/activestorage DirectUpload over a cookie session; mobile is token-auth,
# so it uploads here instead.)
class Api::Mobile::UploadsController < Api::Mobile::BaseController
  MAX_BYTES = 25.megabytes

  def create
    file = params[:file]
    unless file.respond_to?(:tempfile) && file.respond_to?(:original_filename)
      return render json: { error: "no_file" }, status: :unprocessable_entity
    end
    if file.size.to_i > MAX_BYTES
      return render json: { error: "file_too_large", max_mb: 25 }, status: :unprocessable_entity
    end

    blob = ActiveStorage::Blob.create_and_upload!(
      io: file.tempfile,
      filename: file.original_filename.presence || "upload",
      content_type: file.content_type.presence || "application/octet-stream"
    )

    render json: {
      signed_id: blob.signed_id,
      filename: blob.filename.to_s,
      content_type: blob.content_type,
      byte_size: blob.byte_size,
      url: blob.url(expires_in: 1.hour)
    }, status: :created
  rescue => e
    Rails.logger.error("[Mobile::Uploads] #{e.class}: #{e.message}")
    render json: { error: "upload_failed", message: e.message }, status: :unprocessable_entity
  end
end
