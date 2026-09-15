# Web Report Edit v2

Status: implementation complete; release gated by browser regression.

## Product behavior

- `+` adds items to Metrics, Insights, Decisions, Risks, Tasks, Owners and Architecture.
- `×` removes individual items immediately from the editable draft.
- A localized add-block picker can restore a section after its last item was removed.
- Task mutations stay synchronized between desktop table and mobile cards.
- Process connectors are rebuilt after Architecture item mutations; component sections never receive directional connectors.
- Add/remove controls are outside editable fields, excluded from saved JSON, removed in read mode and hidden in print/PDF output.
- Cancel retains the existing safe behavior: reload the persisted report and discard the draft.

## Compatibility

- The save payload remains the additive report v1.1 JSON contract.
- Existing semantic metadata is preserved for unchanged items through stable source indices.
- Control labels and placeholders cover all 10 report languages.

## Automated evidence

- `Tests/web-edit-v2-contract.test.js`
- `Tests/web-edit-v2.test.js`
- Existing Web Report, language and Architecture regression corpora
