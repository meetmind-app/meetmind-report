
# Executive Slide Engine

## Purpose

Executive Slide Engine is a standalone PDF generation engine for MeetMind AI.

It converts a Meeting Report (report_json) into a one-page executive PDF suitable for executives, management presentations, and customer delivery.

The engine is completely independent from the Web Report UI.

---

## Input

```javascript
report_json
```

---

## Output

```text
PDF Document
```

---

## Public API

```javascript
generate(reportJson, options)
```

Parameters:

- reportJson — normalized Meeting Report JSON
- options — enabled/disabled report blocks selected by the user

Returns:

- PDF document

---

## Design Principles

- Standalone implementation
- No dependency on legacy PDF Engine
- Deterministic rendering
- One source of truth: report_json
- Layout defined by approved documentation
- Simplicity over abstraction
- Readability over optimization

---

## Folder Structure

```
executive-slide-engine/

README.md

index.js
```

Additional files will be added only when they become necessary during implementation.

---

## Development Rules

1. Never copy code from the legacy PDF Engine.
2. Every new file has a single responsibility.
3. Finish one component before starting the next.
4. Validate changes using the existing test Meeting Reports.
5. Modify the Web Report only during the final integration step.

---

## Current Status

Implementation started.
