# Design New Skill Graph

Design `flow.json` before writing all step files.

Use `references/flow-patterns.md`.

Model:

- intake
- research or inspection
- decision branches
- authoring steps
- verification
- user approval gates
- rework loops

Keep `flow.json` small. The graph should show relationships. Put detailed instructions in `steps/*.md`.

For new skills, start with a narrow valid graph and expand only when the workflow needs real branching.
