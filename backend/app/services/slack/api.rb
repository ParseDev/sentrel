require "net/http"
require "uri"
require "json"

module Slack
  # Minimal HTTP wrapper around the handful of web-api endpoints we use.
  # No gem dependency — three endpoints, ~20 lines of net/http. Easier to audit
  # than slack-ruby-client and keeps the dep list short.
  module Api
    module_function

    # conversations.create — auto-create a public channel for an agent on
    # install. `is_private: true` would flip to a private group.
    def create_channel(token:, name:, is_private: false)
      call(token: token, path: "conversations.create",
           payload: { name: name, is_private: is_private })
    end

    # conversations.invite — invite the bot user to the channel after create.
    # Slack used to auto-add the creator but bot users sometimes don't get
    # added unless we explicitly invite ourselves.
    def invite_to_channel(token:, channel:, user:)
      call(token: token, path: "conversations.invite",
           payload: { channel: channel, users: user })
    end

    # conversations.setTopic — drop a one-line summary on the channel so
    # teammates know who this channel is for.
    def set_channel_topic(token:, channel:, topic:)
      call(token: token, path: "conversations.setTopic",
           payload: { channel: channel, topic: topic })
    end

    # chat.postMessage with optional per-message identity overrides — required
    # for the multi-agent pattern (one bot, posts as Sarah / Casper / Alex).
    def post_message(token:, channel:, text:, thread_ts: nil, username: nil, icon_url: nil, icon_emoji: nil, blocks: nil)
      payload = { channel: channel, text: text.to_s }
      payload[:thread_ts]  = thread_ts  if thread_ts.present?
      payload[:username]   = username   if username.present?
      payload[:icon_url]   = icon_url   if icon_url.present?
      payload[:icon_emoji] = icon_emoji if icon_emoji.present?
      payload[:blocks]     = blocks     if blocks.is_a?(Array) && blocks.any?
      call(token: token, path: "chat.postMessage", payload: payload)
    end

    def call(token:, path:, payload:)
      uri = URI.parse("https://slack.com/api/#{path}")
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"]  = "application/json; charset=utf-8"
      req["Authorization"] = "Bearer #{token}"
      req.body = payload.to_json
      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true, read_timeout: 10) { |http| http.request(req) }
      JSON.parse(res.body)
    rescue StandardError => e
      { "ok" => false, "error" => e.message }
    end

    # Slack channel name rules: 1-80 chars, lowercase, no spaces or special
    # chars beyond hyphen / underscore. We slugify aggressively + clip.
    def sanitize_channel_name(raw)
      name = raw.to_s.downcase.gsub(/[^a-z0-9_-]/, "-").gsub(/-+/, "-").gsub(/\A-|-\z/, "")
      name = name[0, 80]
      name.presence || "agent"
    end
  end
end
