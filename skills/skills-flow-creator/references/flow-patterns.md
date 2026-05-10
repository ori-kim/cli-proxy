# skills-flow Graph Patterns

Use this reference when designing or reviewing a `flow.json` graph.

## Source Of Truth

`flow.json` describes only the workflow graph:

- graph metadata
- nodes
- edges
- optional `entryNode`

The detailed instructions for each step live in Markdown files referenced by `node.link`.

## Schema

```json
{
  "schemaVersion": "1",
  "name": "my-skill",
  "entryNode": "intake",
  "nodes": [
    {
      "id": "intake",
      "type": "human.input",
      "name": "Capture Brief",
      "link": "steps/intake.md"
    }
  ],
  "edges": [
    {
      "id": "intake-to-design",
      "from": "intake",
      "to": "design",
      "type": "control.next",
      "name": "Brief ready"
    }
  ]
}
```

## Node Patterns

Use node types as free strings. Prefer clear type families:

- `human.input`: gather missing context.
- `decision`: choose a branch.
- `research`: inspect local files or external docs.
- `authoring`: write package files.
- `migration`: transform existing skill content.
- `verification`: validate structure and behavior.
- `loop`: repeat until a condition is met.

Node ids should be stable lower kebab case. Node names should be readable action labels.

## Edge Patterns

Use edge types to express why the next step happens:

- `control.next`: normal sequence.
- `branch.<name>`: conditional path.
- `loop.rework`: return to an earlier node for revision.
- `approval.user`: user approval gate.
- `evidence.<name>`: evidence or source flow into synthesis.

Edge ids should usually use `<from>-to-<to>`. Use a more explicit id when several edges share the same endpoints.

## Graph Design Rules

- Put branch logic in edges, not in node names.
- Put long instructions in node Markdown, not in `flow.json`.
- Keep `flow-ui.json` out of semantic decisions. It stores canvas positions only.
- Make loops explicit. If verification can send work back, model that edge.
- Preserve human approval as a first-class node or edge when user confirmation changes what happens next.

## Validation Checklist

- `schemaVersion` is `"1"`.
- `name` is present and matches `SKILL.md` frontmatter.
- Every node has `id`, `type`, `name`, and `link`.
- Every node link is a relative `.md` path inside the package.
- Every edge has `id`, `from`, `to`, `type`, and `name`.
- Every edge endpoint references an existing node id.
