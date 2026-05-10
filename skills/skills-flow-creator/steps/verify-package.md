# Verify Graph Package

Verify structure and behavior before finishing.

Check:

- `SKILL.md` starts with YAML frontmatter.
- `SKILL.md` has `name` and `description`.
- `flow.json.name` matches the skill name.
- all node links are relative `.md` files inside the package.
- all edge endpoints exist.
- create workflow output has enough detail for a new skill.
- migration workflow preserves the original skill's important behavior.

If the package is inside a `skills-flow` registry, run:

```sh
clip skills-flow validate <name>
```

If validation is unavailable, manually apply the checklist and report what was checked.
