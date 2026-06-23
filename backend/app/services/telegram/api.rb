require "net/http"
require "json"
require "uri"

# Minimal Telegram Bot API client (Rails-side), used for interactive commands
# like /model where Rails needs to reply directly (inline keyboards, callback
# answers) rather than routing through the engine. All calls are best-effort —
# a Telegram hiccup must never 500 the webhook.
module Telegram
  module Api
    BASE = "https://api.telegram.org".freeze

    module_function

    def send_message(bot_token, chat_id, text, reply_markup: nil)
      payload = { chat_id: chat_id, text: text }
      payload[:reply_markup] = reply_markup if reply_markup
      call(bot_token, "sendMessage", payload)
    end

    def edit_message_text(bot_token, chat_id, message_id, text, reply_markup: nil)
      payload = { chat_id: chat_id, message_id: message_id, text: text }
      payload[:reply_markup] = reply_markup if reply_markup
      call(bot_token, "editMessageText", payload)
    end

    # Pops the loading state on the tapped button; `text` shows as a toast.
    def answer_callback_query(bot_token, callback_query_id, text: nil)
      call(bot_token, "answerCallbackQuery", { callback_query_id: callback_query_id, text: text }.compact)
    end

    # Registers the bot's slash-command menu (the "/" autocomplete list).
    def set_my_commands(bot_token, commands)
      call(bot_token, "setMyCommands", { commands: commands })
    end

    def call(bot_token, method, payload)
      return nil if bot_token.blank?
      uri = URI("#{BASE}/bot#{bot_token}/#{method}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 10
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"] = "application/json"
      req.body = JSON.generate(payload)
      res = http.request(req)
      JSON.parse(res.body) rescue nil
    rescue => e
      Rails.logger.warn("[Telegram::Api] #{method} failed: #{e.class}: #{e.message}")
      nil
    end
  end
end
