# Skill Creator Patterns

This reference distills the skill creation pattern from:

- https://skills.sh/anthropics/skills/skill-creator

## Lifecycle

Use a loop instead of treating skill creation as a single draft:

1. Capture intent and trigger conditions.
2. Research edge cases, dependencies, and comparable workflows.
3. Draft `SKILL.md`.
4. Create 2 or 3 realistic eval prompts when the output is objectively checkable.
5. Run or reason through the evals.
6. Revise the skill based on observed gaps.

For `skills-flow-creator`, map that lifecycle into graph nodes instead of burying it in one long instruction document.

## Skill Anatomy

Every skill package needs:

- `SKILL.md` with frontmatter `name` and `description`.
- concise body instructions that fit the trigger context.
- optional bundled resources loaded only when needed.

Useful bundled resource directories:

- `steps/`: skills-flow node instructions.
- `references/`: supporting material and design rules.
- `templates/`: reusable output formats.
- `scripts/`: deterministic helper code.
- `evals/`: test prompts and expected outcomes.

## Progressive Disclosure

Keep the entrypoint small:

- Metadata is always visible.
- `SKILL.md` is loaded when the skill triggers.
- Bundled resources are opened only when the active workflow needs them.

For graph skills, `SKILL.md` should point the agent to `flow.json` and the relevant step file instead of repeating every detail inline.

## Trigger Description

The frontmatter `description` is the main trigger surface. It should include:

- what the skill does
- when to use it
- concrete user phrases or contexts that should trigger it

Avoid putting trigger rules only in the body. The body may not be read until after the skill is selected.

## Evaluation

Create eval prompts for workflows with concrete outputs such as file transforms, code generation, migration, extraction, validation, or fixed multi-step processes.

Skip heavy eval machinery for subjective skills unless the user asks for it. In those cases, use examples or review checklists instead.
