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
REF_PREFIX = "#/components/schemas/"
# Schema names that share a suffix (e.g. `*_Multi_Relationship_Object`) are listed as one
# line once there are at least this many of them, so a spec-wide refactor stays readable.
GROUP_MIN = 5


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


def flatten(schema, all_schemas, seen=()):
    """Effective properties, required and enum of a schema, following `$ref` and `allOf`.

    A schema can move its properties into referenced parts without changing its shape,
    e.g. `X_Document` becoming `allOf: [X_Object, Top_Level_Included]`. Comparing only the
    schema's own `properties` would report all of them as removed.
    """
    props, required, enum = set(), set(), set()
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith(REF_PREFIX):
        target = ref[len(REF_PREFIX):]
        if target not in seen and isinstance(all_schemas.get(target), dict):
            props, required, enum = flatten(all_schemas[target], all_schemas, seen + (target,))
    for part in schema.get("allOf") or []:
        if isinstance(part, dict):
            part_props, part_required, part_enum = flatten(part, all_schemas, seen)
            props |= part_props
            required |= part_required
            enum |= part_enum
    props |= set((schema.get("properties") or {}).keys())
    required |= set(schema.get("required") or [])
    enum |= {str(v) for v in schema.get("enum") or []}
    return props, required, enum


def schema_changes(name, old, new, old_schemas, new_schemas):
    old_props, old_required, old_enum = flatten(old, old_schemas, (name,))
    new_props, new_required, new_enum = flatten(new, new_schemas, (name,))

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


def schema_items(names):
    """`Schema X` lines, with large families of same-suffix schemas folded into one line."""
    remaining = sorted(names)
    items = []
    for size in (3, 2):
        by_suffix = {}
        for name in remaining:
            parts = name.split("_")
            if len(parts) > size:
                by_suffix.setdefault("_".join(parts[-size:]), []).append(name)
        grouped = set()
        for suffix, members in sorted(by_suffix.items()):
            if len(members) >= GROUP_MIN:
                items.append(
                    f"{len(members)} schemas {code('*_' + suffix)}, e.g. {code(members[0])}"
                )
                grouped.update(members)
        remaining = [name for name in remaining if name not in grouped]
    return [f"Schema {code(name)}" for name in remaining] + items


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
    added += schema_items(set(new_schemas) - set(old_schemas))

    changed = [f"Sync to new API definitions (version: {new_version})"]
    removed = [f"Endpoint {code(op)}" for op in sorted(old_ops - new_ops)]
    removed += schema_items(set(old_schemas) - set(new_schemas))

    for name in sorted(set(old_schemas) & set(new_schemas)):
        schema_changed, schema_removed = schema_changes(
            name, old_schemas[name] or {}, new_schemas[name] or {}, old_schemas, new_schemas
        )
        changed += schema_changed
        removed += schema_removed

    lines = section("Added", added) + section("Changed", changed) + section("Removed", removed)
    sys.stdout.write("\n".join(lines).rstrip("\n") + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
