# One file inside a SkillDefinition's bundle (SKILL.md + optional helper
# scripts / schemas / docs). The engine writes these into the agent's
# workspace at `<dataDir>/skills/<slug>/<path>` on sync, so the agent can
# Read them with its built-in file tools.
#
# Path validation defends against ../ escapes and absolute paths.
class SkillFile < ApplicationRecord
  EXT_TO_TYPE = {
    "md"   => "md",
    "markdown" => "md",
    "py"   => "py",
    "js"   => "js",
    "mjs"  => "js",
    "ts"   => "ts",
    "tsx"  => "ts",
    "json" => "json",
    "yaml" => "yaml",
    "yml"  => "yaml",
    "sh"   => "sh",
    "bash" => "sh",
    "rb"   => "rb",
    "txt"  => "text",
    "csv"  => "text"
  }.freeze

  PATH_REGEX = %r{\A[a-zA-Z0-9_][a-zA-Z0-9_./-]*\z}

  belongs_to :skill_definition, touch: true

  before_validation :normalize_path
  before_validation :infer_file_type

  validates :path, presence: true, format: { with: PATH_REGEX, message: "must be a relative path (letters/digits/_/-/./), no .. segments" }
  validates :path, uniqueness: { scope: :skill_definition_id, case_sensitive: false }
  validate  :reject_parent_segments
  validate  :reject_absolute_path

  scope :ordered, -> { order(position: :asc, path: :asc) }

  def filename
    File.basename(path)
  end

  def dirname
    d = File.dirname(path)
    d == "." ? "" : d
  end

  private

  def normalize_path
    return if path.blank?
    self.path = path.to_s.strip.sub(%r{\A/+}, "").gsub(%r{/+}, "/")
  end

  def infer_file_type
    return if file_type.present?
    ext = File.extname(path).delete_prefix(".").downcase
    self.file_type = EXT_TO_TYPE[ext] || "other"
  end

  def reject_parent_segments
    return if path.blank?
    return unless path.split("/").include?("..")
    errors.add(:path, "cannot contain .. segments")
  end

  def reject_absolute_path
    return if path.blank?
    errors.add(:path, "must be relative (no leading /)") if path.start_with?("/")
  end
end
