---
slug: web-search
name: Web Research
description: Search the web for information, companies, and market data
category: common
icon: search
requires_connections: []
---

# Web Search

When you need to find information online, use the Bash tool to make HTTP requests.

## Quick Search
```bash
curl -s "https://api.exa.ai/search" \
  -H "x-api-key: $EXA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR QUERY", "numResults": 5, "contents": {"text": {"maxCharacters": 3000}, "summary": true}}'
```

## Tips
- Keep queries specific and focused
- Use 3-5 results for most queries
- For company research, search for "[Company] funding news team"
- For people research, search for "[Name] [Company] LinkedIn"
- Always cite your sources when reporting findings
