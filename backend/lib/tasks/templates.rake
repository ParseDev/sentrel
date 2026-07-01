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

  # Repo-driven sync: fetch the PUBLIC agent-templates repo tarball and import
  # every bundle. Run on a schedule (sidekiq-cron) or trigger from a GitHub
  # Action on push to the templates repo (repository_dispatch → this task).
  #
  #   rails templates:sync
  #   BUNDLES_REPO=SentrelAI/agent-templates BUNDLES_REF=main rails templates:sync
  desc "Sync system templates from the public agent-templates GitHub repo"
  task sync: :environment do
    require "open-uri"
    require "tmpdir"
    repo = ENV.fetch("BUNDLES_REPO", "SentrelAI/agent-templates")
    ref  = ENV.fetch("BUNDLES_REF", "main")
    url  = "https://codeload.github.com/#{repo}/tar.gz/refs/heads/#{ref}"
    puts "[templates:sync] fetching #{url}"

    Dir.mktmpdir do |tmp|
      tarball = File.join(tmp, "bundles.tar.gz")
      URI.parse(url).open { |io| File.binwrite(tarball, io.read) }
      abort "[templates:sync] extract failed" unless system("tar", "xzf", tarball, "-C", tmp)
      # GitHub tarballs extract to <repo>-<ref>/…
      root = Dir.children(tmp)
                .map { |c| File.join(tmp, c) }
                .find { |p| File.directory?(p) && File.basename(p).start_with?(File.basename(repo)) }
      abort "[templates:sync] extracted repo dir not found" unless root
      Rake::Task["templates:import_bundles"].invoke(root, repo, ref)
    end
  end
end
