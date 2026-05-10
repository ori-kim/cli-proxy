---
name: skills-flow-creator
description: Create and migrate agent skills as skills-flow graph packages. Use this whenever the user wants to create a new skill, convert an existing SKILL.md into skills-flow, design a graph-based skill workflow, or decide how skill steps should be represented with flow.json nodes and edges.
---

# skills-flow-creator

Use this skill to design, create, and migrate agent skills in the `skills-flow` format.

The skill has two workflows:

- `create`: create a new graph-shaped skill from an interview brief.
- `migration`: convert an existing `SKILL.md` skill into a graph-shaped skills-flow package.

Read `flow.json` first when the user asks for an end-to-end workflow. It is the source of truth for the step graph. Each node's detailed instruction is stored in the linked Markdown file under `steps/`.

## Core Concepts

Use `references/skill-creator-patterns.md` for the skill creation baseline.
Use the Anthropic skill pattern as the base structure:

- Keep `SKILL.md` as the discoverable entry point with frontmatter `name` and `description`.
- Put detailed reusable material in bundled resources such as `steps/`, `references/`, `templates/`, or `evals/`.
- Keep the entrypoint concise and load deeper files only when the task needs them.
- Prefer a few concrete eval prompts for file-transform or workflow skills.

Use the skills-flow graph pattern as the execution map:

- `flow.json` only describes step relationships.
- Node content lives in Markdown files referenced by `node.link`.
- Node and edge `type` values are free strings. Choose clear values, but do not rely on a hardcoded preset.
- `flow-ui.json` is UI state only. Do not use it as source of truth.

## Choosing A Workflow

Use `create` when the user wants a new skill or says things like:

- "make a skill for ..."
- "turn this process into a skill"
- "design a new skills-flow package"
- "I want a graph workflow for this skill"

Use `migration` when the user already has a skill or says things like:

- "convert this existing skill"
- "migrate this SKILL.md"
- "make this legacy skill into skills-flow"
- "extract steps from this skill"

If the user does not specify which workflow they want, infer it from the presence of an existing skill path. If no path exists, use `create`.

## Required Output

For a completed package, produce or update this structure:

```text
<skill-name>/
  SKILL.md
  flow.json
  steps/
    <node-id>.md
```

Optional files:

```text
<skill-name>/
  references/
  templates/
  evals/evals.json
```

## Graph Rules

Follow `references/flow-patterns.md` when creating or reviewing the graph.

Every `flow.json` must use this shape:

```json
{
  "schemaVersion": "1",
  "name": "my-skill",
  "entryNode": "intake",
  "nodes": [
    { "id": "intake", "type": "human.input", "name": "Capture Skill Brief", "link": "steps/intake.md" }
  ],
  "edges": [
    { "id": "intake-to-design", "from": "intake", "to": "design", "type": "control.next", "name": "Brief ready" }
  ]
}
```

Use stable node ids in lower kebab case. Use edge ids in `<from>-to-<to>` form unless the edge is conditional.

## Workflow: create

Follow the create path in `flow.json`.

1. Capture the skill intent, trigger phrases, expected outputs, dependencies, and whether evals are useful.
2. Draft the `SKILL.md` entrypoint and keep it compact.
3. Design the step graph before writing many files. The graph should show decisions, human approvals, loops, and verification points.
4. Write each node instruction as a Markdown file under `steps/`.
5. Add references or templates only when they reduce repeated explanation.
6. Add `evals/evals.json` when the skill has objectively checkable behavior.
7. Validate that every node link points to an existing relative `.md` file.

## Workflow: migration

Follow the migration path in `flow.json`.

1. Read the existing skill without changing it first.
2. Extract the implicit workflow: intake, research, transformation, verification, export, loops, and approvals.
3. Preserve the original skill's frontmatter `name` and `description` unless the user asks to rename.
4. Move long procedural sections into node Markdown files.
5. Keep `SKILL.md` as the bootstrap entrypoint that tells the agent to read `flow.json`.
6. Record graph edges for order, branches, retries, and user approval gates.
7. Validate the result and call out behavior that could not be mapped cleanly.

## Verification Checklist

Before finishing:

- `SKILL.md` has `name` and `description`.
- `flow.json.name` matches `SKILL.md` frontmatter `name`.
- Empty graphs are allowed only for initial scaffolds. Real create or migration output should contain nodes.
- Every node has `id`, `type`, `name`, and `link`.
- Every linked node source is a relative `.md` path inside the package.
- Every edge has `id`, `from`, `to`, `type`, and `name`.
- Every edge endpoint references an existing node id.
- The final answer explains which workflow was used and where the package was written.
