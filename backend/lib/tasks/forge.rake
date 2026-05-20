namespace :forge do
  desc "Print env-source health table. Exits non-zero if ANTHROPIC_API_KEY missing."
  task check_env: :environment do
    rows = [
      ["ANTHROPIC_API_KEY", ENV["ANTHROPIC_API_KEY"], true,  "required — no key, no generation"],
      ["SKILLS_SH_API_KEY", ENV["SKILLS_SH_API_KEY"], false, "optional — enables skills.sh API (8420 skills)"],
      ["GITHUB_TOKEN",      ENV["GITHUB_TOKEN"],      false, "optional — enables GitHub search source"],
      ["COMPOSIO_API_KEY",  ENV["COMPOSIO_API_KEY"],  false, "optional — for live toolkit catalog refresh"],
    ]
    puts "Forge env-source health:"
    puts "─" * 90
    missing_hard = false
    rows.each do |name, value, required, note|
      mark = value.present? ? "✓" : "✗"
      last4 = value.present? ? " (last 4: ...#{value[-4..]})" : ""
      hardness = required ? "REQUIRED" : "optional"
      missing_hard = true if required && value.blank?
      puts "  #{mark} #{name.ljust(20)} #{hardness.ljust(9)}#{last4}"
      puts "      #{note}"
    end
    puts "─" * 90
    if missing_hard
      puts "✗ Missing required env vars. Set them before running forge:bootstrap."
      exit 1
    else
      puts "✓ Ready to run forge:bootstrap"
    end
  end

  desc "Generate agent templates from a brief list. Args: batch (1|2|all, default 1), concurrency (default 20)"
  task :templates, [:batch, :concurrency] => :environment do |_, args|
    batch = (args[:batch] || "1").to_s
    concurrency = (args[:concurrency] || "20").to_i

    briefs = case batch
             when "1"   then Forge::RoleBriefs::BATCH_1
             when "2"   then Forge::RoleBriefs::BATCH_2
             when "all" then Forge::RoleBriefs::ALL
             else
               raise "Unknown batch: #{batch} (use 1, 2, or all)"
             end

    puts "[forge:templates] firing #{briefs.size} briefs at concurrency=#{concurrency}"
    summary = Forge::Orchestrator.run(briefs: briefs, generator: Forge::TemplateGenerator, concurrency: concurrency)
    puts summary
    puts "[forge:templates] AgentTemplate count: #{AgentTemplate.count}"
  end

  desc "Generate skills from a brief list. Args: batch (1|2|all, default 1), concurrency (default 20)"
  task :skills, [:batch, :concurrency] => :environment do |_, args|
    batch = (args[:batch] || "1").to_s
    concurrency = (args[:concurrency] || "20").to_i

    briefs = case batch
             when "1"   then Forge::SkillBriefs::BATCH_1
             when "2"   then Forge::SkillBriefs::BATCH_2
             when "all" then Forge::SkillBriefs::ALL
             else
               raise "Unknown batch: #{batch} (use 1, 2, or all)"
             end

    puts "[forge:skills] firing #{briefs.size} briefs at concurrency=#{concurrency}"
    summary = Forge::Orchestrator.run(briefs: briefs, generator: Forge::SkillGenerator, concurrency: concurrency)
    puts summary
    puts "[forge:skills] SkillDefinition count: #{SkillDefinition.count}"
  end

  desc "Generate one template from a free-text role description. Args: description"
  task :template_one, [:description] => :environment do |_, args|
    description = args[:description].to_s.strip
    raise "Provide a description, e.g. rake forge:template_one[\"I want a real-estate showing scheduler\"]" if description.empty?
    res = Forge::TemplateGenerator.new(brief: description).call
    if res.ok?
      puts "[forge:template_one] ✓ created #{res.template.slug}"
      puts "  name:     #{res.template.name}"
      puts "  role:     #{res.template.role}"
      puts "  category: #{res.template.category}"
      puts "  model:    #{res.template.suggested_model}"
    else
      puts "[forge:template_one] ✗ #{res.error}"
    end
  end

  desc "Full 100-template bootstrap: pre-warm skills + generate IdeaBank::ALL"
  task :bootstrap, [:concurrency, :prewarm_count] => :environment do |_, args|
    concurrency = (args[:concurrency] || "20").to_i
    prewarm = (args[:prewarm_count] || "50").to_i
    summary = Forge::Bootstrap.new(concurrency: concurrency, prewarm_count: prewarm).run
    puts summary
  end

  desc "Pre-warm skill library only (skills.sh trending or KNOWN_REPOS)"
  task :prewarm_skills, [:concurrency, :count] => :environment do |_, args|
    concurrency = (args[:concurrency] || "20").to_i
    count = (args[:count] || "50").to_i
    summary = Forge::Bootstrap.new(briefs: [], concurrency: concurrency, prewarm_count: count).run
    puts summary
  end

  desc "Generate one skill from a free-text description. Args: description"
  task :skill_one, [:description] => :environment do |_, args|
    description = args[:description].to_s.strip
    raise "Provide a description, e.g. rake forge:skill_one[\"send fax via documo\"]" if description.empty?
    res = Forge::SkillGenerator.new(brief: description).call
    if res.ok?
      puts "[forge:skill_one] ✓ created #{res.skill.slug}"
      puts "  file: #{res.file_path}"
    else
      puts "[forge:skill_one] ✗ #{res.error}"
    end
  end
end
