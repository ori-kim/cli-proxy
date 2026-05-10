# Choose Create Or Migration

Choose the workflow branch.

Use `create` when:

- there is no existing `SKILL.md`
- the user wants a new skill from a brief
- the output should be a new skills-flow package

Use `migration` when:

- the user provides a path to an existing skill
- the user asks to convert or migrate a legacy skill
- the task is to preserve behavior while changing package structure

If uncertain, inspect the provided path. A directory with `SKILL.md` but no `flow.json` usually means `migration`.
