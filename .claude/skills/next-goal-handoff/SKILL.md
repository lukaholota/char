---
name: next-goal-handoff
description: Draft a ready-to-paste prompt for the next chat after a task or KR is completed. Use when the user asks in Ukrainian or English for a "next goal prompt", "handoff prompt", "prompt for the next chat", or says "скинь промпт з гоалом".
---

# Next Goal Handoff

Return one ready-to-paste prompt in a fenced `text` block. Do not create a goal, change files, or run tools merely to draft the prompt.

## Build the prompt

1. Infer the next concrete KR from the current plan and completed work. If that is uncertain, say what is missing instead of inventing scope.
2. Start with the repository path and an exact goal objective in Ukrainian when the conversation is Ukrainian.
3. Include the required documents from project instructions plus the active objective README/KR and a handoff/journal when one exists.
4. Carry forward non-negotiable constraints that matter here: dirty worktree, edition/ruleset, no commit/push unless asked, command side-effect explanations, database safety, and the allowed file scope.
5. State a bounded numbered scope, measurable completion criteria, proofs/tests, and an explicit instruction to close only the new goal/KR—not its parent objective.
6. Preserve known blockers and unrun checks from the prior task. Do not claim tests passed unless the conversation established that they did.

## Quality bar

- Make it actionable without needing the earlier chat.
- Keep it concise; omit generic boilerplate that does not affect the next KR.
- Do not silently broaden scope or authorize production, schema, SQL, golden-fixture, commit, or push changes.
- If project documentation defines a safe order, choose its next unfinished KR rather than a speculative refactor.
