#!/usr/bin/env python3
"""Summarise the difference between two TIDAL API OpenAPI specs as changelog markdown.

The spec is JSON:API, so every schema is reachable from hundreds of endpoints via
`included`. Endpoint-level diff tools (e.g. oasdiff) therefore repeat one schema change
under every endpoint. This script reports at the level a consumer cares about instead:
endpoints added/removed, schemas added/removed, and per-schema property/enum changes.

Usage: api_spec_changelog.py <old-spec.json> <new-spec.json>

Prints Keep a Changelog sections (### Added / ### Changed / ### Removed) to stdout.
"""

import json
import sys

METHODS = ("get", "post", "put", "patch", "delete")
MAX_ITEMS_PER_SECTION = 50


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def operations(spec):
    return {
        f"{method.upper()} {path}"
        for path, item in (spec.get("paths") or {}).items()
        for method in METHODS
        if method in (item or {})
    }


def schemas(spec):
    return (spec.get("components") or {}).get("schemas") or {}


def code(value):
    return f"`{value}`"


def schema_changes(name, old, new):
    old_props = set((old.get("properties") or {}).keys())
    new_props = set((new.get("properties") or {}).keys())
    old_required = set(old.get("required") or [])
    new_required = set(new.get("required") or [])
    old_enum = {str(v) for v in old.get("enum") or []}
    new_enum = {str(v) for v in new.get("enum") or []}

    changed, removed = [], []
    for prop in sorted(new_props - old_props):
        kind = "required property" if prop in new_required else "property"
        changed.append(f"{code(name)}: added {kind} {code(prop)}")
    for prop in sorted((new_required - old_required) & old_props & new_props):
        changed.append(f"{code(name)}: {code(prop)} is now required")
    for prop in sorted((old_required - new_required) & old_props & new_props):
        changed.append(f"{code(name)}: {code(prop)} is now optional")
    if new_enum - old_enum:
        values = ", ".join(code(v) for v in sorted(new_enum - old_enum))
        changed.append(f"{code(name)}: added enum values {values}")

    for prop in sorted(old_props - new_props):
        removed.append(f"{code(name)}: property {code(prop)}")
    if old_enum - new_enum:
        values = ", ".join(code(v) for v in sorted(old_enum - new_enum))
        removed.append(f"{code(name)}: enum values {values}")
    return changed, removed


def section(title, items):
    if not items:
        return []
    lines = [f"### {title}", ""]
    lines += [f"- {item}" for item in items[:MAX_ITEMS_PER_SECTION]]
    if len(items) > MAX_ITEMS_PER_SECTION:
        lines.append(f"- …and {len(items) - MAX_ITEMS_PER_SECTION} more")
    lines.append("")
    return lines


def main(old_path, new_path):
    old, new = load(old_path), load(new_path)
    new_version = (new.get("info") or {}).get("version") or "unknown"

    old_ops, new_ops = operations(old), operations(new)
    old_schemas, new_schemas = schemas(old), schemas(new)

    added = [f"Endpoint {code(op)}" for op in sorted(new_ops - old_ops)]
    added += [f"Schema {code(s)}" for s in sorted(set(new_schemas) - set(old_schemas))]

    changed = [f"Sync to new API definitions (version: {new_version})"]
    removed = [f"Endpoint {code(op)}" for op in sorted(old_ops - new_ops)]
    removed += [f"Schema {code(s)}" for s in sorted(set(old_schemas) - set(new_schemas))]

    for name in sorted(set(old_schemas) & set(new_schemas)):
        schema_changed, schema_removed = schema_changes(
            name, old_schemas[name] or {}, new_schemas[name] or {}
        )
        changed += schema_changed
        removed += schema_removed

    lines = section("Added", added) + section("Changed", changed) + section("Removed", removed)
    sys.stdout.write("\n".join(lines).rstrip("\n") + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
