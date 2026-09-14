# Architecture & Process v2

## Product invariant

Directional connectors are allowed only when transcript evidence explicitly supports a sequence, dependency, hand-off, pipeline, or ordered workflow. A visual preference never upgrades a section to `process`.

## Canonical contract

```json
{
  "architecture": {
    "mode": "components",
    "sections": [
      {
        "title": "Delivery flow",
        "mode": "process",
        "layout": "process",
        "items": []
      },
      {
        "title": "System surfaces",
        "mode": "components",
        "layout": "components",
        "items": []
      }
    ]
  }
}
```

- `mode` is canonical and always `process` or `components`.
- `layout` mirrors the canonical section mode for backward consumers.
- A section-level mode overrides the root default, so mixed reports are supported.
- Legacy aliases (`flow`, `pipeline`, `sequence`, `workflow`) normalize to `process`.
- Missing or unknown classification normalizes conservatively to `components`.
- Unknown root, section, and item properties survive edit/save round trips.

## Rendering

- Process sections get CSS/vector connectors; no arrow characters are inserted into report text.
- Up to four process steps use a compact horizontal flow on wide screens.
- Longer flows and all compact screens use a vertical flow with no horizontal scrolling.
- Component sections use a balanced responsive grid and never receive connectors.
- RTL flows preserve logical item order and draw the horizontal direction right-to-left.

## Regression gate

Unit and browser tests cover true process, components, mixed sections, legacy data, empty sections, long flow, mobile reflow, Persian RTL, content preservation, and edit/save round trips.
