# Write Skills Flow Package

Create or update the package structure:

```text
<skill-name>/
  SKILL.md
  flow.json
  steps/
    <node-id>.md
```

`SKILL.md` should:

- include frontmatter with `name` and `description`
- tell the agent to read `flow.json`
- stay concise

`flow.json` should:

- use schema version `1`
- include the package name
- include nodes and edges
- avoid embedding long instructions

Every node link should point to an existing step Markdown file.
