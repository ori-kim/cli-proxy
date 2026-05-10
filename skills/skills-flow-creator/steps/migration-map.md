# Map Legacy Skill To Graph

Extract the implicit workflow from the legacy skill and map it to nodes and edges.

Use one node for each meaningful step:

- intake or context capture
- research
- transformation
- generation
- validation
- export
- feedback or iteration

Use edges to represent:

- sequence
- branches
- retry loops
- user approvals
- evidence flow

Move detailed procedural text into `steps/*.md`. Keep `SKILL.md` as a bootstrap entry that points to `flow.json`.

When content does not map cleanly, preserve it in `references/` and mention the gap.
