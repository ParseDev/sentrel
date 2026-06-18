# Self-hosted Meta Ads MCP (open-source pipeboard-co/meta-ads-mcp), run with
# OUR own Meta app + per-request Meta access tokens — no Pipeboard platform,
# no broker. Multi-tenant: each request carries the customer's Meta token in
# the Authorization header, so one instance serves every connected account.
FROM python:3.12-slim

RUN pip install --no-cache-dir meta-ads-mcp

# Sentrel's Meta app id. No app SECRET needed: clients authenticate with a
# self-contained Meta access token per request (verified locally).
ENV META_APP_ID=2066264421433449
ENV PORT=8080

EXPOSE 8080
CMD ["python", "-m", "meta_ads_mcp", "--transport", "streamable-http", "--host", "0.0.0.0", "--port", "8080"]
