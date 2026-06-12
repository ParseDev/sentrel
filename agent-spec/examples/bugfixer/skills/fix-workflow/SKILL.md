---
name: fix-workflow
description: Use when shipping a code fix as a GitHub pull request, applying review rework to an existing PR, or wiring a shipped PR back to its Sentry issue and Linear ticket. Step-by-step branch → commit-via-API → PR flow with exact tool names.
---

# Fix workflow — branch, commit via API, PR, link back

You change code through the GitHub API, not a local checkout. That
means every edit is a file-level operation: read the file, produce the
corrected full content, write it back on a branch. This works well for
surgical fixes (which is all you're allowed to ship) and fails badly
for sweeping changes (which the triage policy already forbids).

## Tool names (verified — use EXACTLY these)

| Step | Tool |
|------|------|
| Repo metadata / default branch | `GITHUB_GET_A_REPOSITORY` |
| Read a file (content + sha) | `GITHUB_GET_REPOSITORY_CONTENT` |
| Find code by symbol/string | `GITHUB_SEARCH_CODE` |
| Get branch head sha | `GITHUB_GET_A_REFERENCE` |
| Create branch | `GITHUB_CREATE_A_REFERENCE` |
| Commit a file change | `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS` |
| Open the PR | `GITHUB_CREATE_A_PULL_REQUEST` |
| Comment on PR/issue | `GITHUB_CREATE_AN_ISSUE_COMMENT` |
| Linear: comment PR link | `LINEAR_CREATE_LINEAR_COMMENT` |
| Linear: move ticket state | `LINEAR_UPDATE_ISSUE` |
| Sentry: read issue/events | `SENTRY_GET_ORGANIZATION_ISSUE_DETAILS`, `SENTRY_RETRIEVE_ISSUE_EVENTS_BY_ID` |
| Sentry: mark addressed | `SENTRY_UPDATE_PROJECT_ISSUE_STATUS_AND_DETAILS` |

Never invent variants of these names. If a call errors with "tool not
found", re-read this table — do not guess.

## Shipping a fix

1. **Locate.** From the stack trace or ticket, identify repo + file +
   line. Use `GITHUB_SEARCH_CODE` when the trace gives a symbol but no
   path. Read the file with `GITHUB_GET_REPOSITORY_CONTENT` — note its
   `sha`; you need it to commit. Read enough surrounding code to be
   sure of the invariant you're fixing.
2. **Branch.** `GITHUB_GET_A_REPOSITORY` → `default_branch`. Then
   `GITHUB_GET_A_REFERENCE` with `ref=heads/<default_branch>` → head
   `sha`. Then `GITHUB_CREATE_A_REFERENCE` with
   `ref=refs/heads/fix/<id>-<slug>` and that sha.
3. **Commit.** For each file (max 3): produce the FULL corrected file
   content — never a fragment — and call
   `GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS` with `path`, `branch`
   (your fix branch), `message` (`Fix: <symptom> (<ticket-id>)`),
   `content` (base64-encode the full file), and the file's `sha` from
   step 1. Re-read the file after writing if you commit to it twice.
4. **PR.** `GITHUB_CREATE_A_PULL_REQUEST` with `head` = your branch,
   `base` = the default branch, title and description per the PR
   conventions in the triage policy.
5. **Link back.** `LINEAR_CREATE_LINEAR_COMMENT` on the ticket with the
   PR URL and your one-paragraph root cause; `LINEAR_UPDATE_ISSUE` to
   move it to In Review (look up state ids with
   `LINEAR_LIST_LINEAR_STATES` once and remember them). For Sentry
   items, `SENTRY_UPDATE_PROJECT_ISSUE_STATUS_AND_DETAILS` to mark the
   issue being addressed. Update your ledger.

## Rework on an existing PR

Same branch, steps 1 + 3 only — read the file ON THE BRANCH (pass
`ref=fix/...` to `GITHUB_GET_REPOSITORY_CONTENT`, the sha differs from
the default branch now), commit the requested change, then reply on the
PR thread with `GITHUB_CREATE_AN_ISSUE_COMMENT` (PRs are issues for
commenting purposes — use the PR number).

## Invariants

- The diff you ship is the diff you described — no drive-by edits.
- `content` must be the complete file, base64-encoded. A partial file
  REPLACES the whole file and destroys code. When in doubt, re-read.
- A `409` or "sha mismatch" means the file moved under you: re-read the
  file on the branch, re-apply your change to the fresh content, retry
  once. Two failures → stop and report on the ticket.
- A `404` on a repo/file usually means no access, not absence —
  escalate rather than assuming the path changed.
- Two failed attempts at ANY step → stop, write what you tried on the
  ticket, escalate. Never thrash against the API.
