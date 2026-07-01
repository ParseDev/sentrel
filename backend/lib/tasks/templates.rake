# Import agent-bundle/v1 directories as SYSTEM templates onto /templates.
# Bundles are the source of truth; this is how they land in the app.
#
#   rails templates:import_bundles[/path/to/sentrel-agent-templates]
#   rails templates:import_bundles[/path/to/repo,SentrelAI/agent-templates,main]
#
# Each immediate sub-directory that contains an agent.yaml is imported. The
# source_url is derived as https://github.com/<repo>/tree/<ref>/<dir>. Idempotent.
namespace :templates do
  desc "Import agent bundles from a checkout dir as system templates"
  task :import_bundles, %i[dir repo ref] => :environment do |_t, args|
    dir  = args[:dir].presence || ENV["BUNDLES_DIR"]
    repo = args[:repo].presence || ENV.fetch("BUNDLES_REPO", "SentrelAI/agent-templates")
    ref  = args[:ref].presence  || ENV.fetch("BUNDLES_REF", "main")
    abort "usage: rails templates:import_bundles[/path/to/bundles-checkout]" if dir.blank?
    abort "not a directory: #{dir}" unless File.directory?(dir)

    bundles = Dir.children(dir)
                 .map { |name| File.join(dir, name) }
                 .select { |p| File.directory?(p) && File.file?(File.join(p, "agent.yaml")) }
                 .sort

    abort "no bundles (dirs with agent.yaml) found under #{dir}" if bundles.empty?
    puts "[templates:import_bundles] #{bundles.size} bundle(s) from #{repo}@#{ref}"

    ok = 0
    bundles.each do |bundle_dir|
      name = File.basename(bundle_dir)
      source_url = "https://github.com/#{repo}/tree/#{ref}/#{name}"
      begin
        t = AgentTemplates::BundleImporter.new(dir: bundle_dir, source_url: source_url, source_ref: ref).call
        puts "  ✓ #{t.slug.ljust(20)} v#{t.current_version&.version_number}  ← #{name}"
        ok += 1
      rescue => e
        warn "  ✗ #{name}: #{e.class}: #{e.message}"
      end
    end
    puts "[templates:import_bundles] imported #{ok}/#{bundles.size}"
  end
end
