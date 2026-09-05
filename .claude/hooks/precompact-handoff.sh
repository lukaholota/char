#!/usr/bin/env bash
cat <<'EOF'
{"continue": false, "stopReason": "Context cap (~1M tokens) reached for this repo. Autocompact is intentionally disabled here — hand off instead.", "systemMessage": "Context cap (~1M) reached — use next-goal-handoff instead of autocompact.", "hookSpecificOutput": {"hookEventName": "PreCompact", "additionalContext": "This repo caps sessions at ~1M tokens of context and the owner wants a clean handoff instead of autocompact, always — no exceptions for being close to done. Invoke the next-goal-handoff skill now to draft a ready-to-paste prompt for a fresh session, tell the user the context cap was reached, and stop."}}
EOF
