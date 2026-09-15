'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const edit = fs.readFileSync(path.join(root, 'edit-v2.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'report-v1.1.css'), 'utf8');

assert.ok(index.includes('<script src="edit-v2.js"></script>'), 'Edit v2 module is not wired.');
assert.ok(app.includes('LOREVIEditV2?.sync?.(isEditMode)'), 'Edit mode does not synchronize v2 controls.');
assert.ok(edit.includes("const KINDS = ['metric','insight','decision','risk','task','owner','architecture']"), 'Repeatable block coverage is incomplete.');
assert.ok(edit.includes("dataEditV2Action='add'") || edit.includes("dataset.editV2Action='add'"), 'Add action is missing.');
assert.ok(edit.includes("dataEditV2Action = action") || edit.includes("dataset.editV2Action = action"), 'Generic edit action contract is missing.');
assert.ok(edit.includes("dataEditV2Kind = kind") || edit.includes("dataset.editV2Kind = kind"), 'Generic item kind contract is missing.');
assert.ok(edit.includes("const COPY = Object.freeze"), 'Localized control labels are missing.');
for (const language of ['en','ru','es','pt','tr','id','hi','ar','uz','fa']) {
  assert.ok(new RegExp(`\\b${language}:\\{`).test(edit), `Edit v2 copy is missing for ${language}.`);
}
assert.ok(styles.includes('@media print') && styles.includes('.edit-v2-control'), 'Edit controls are not excluded from print.');
assert.ok(edit.includes("document.querySelectorAll('.edit-v2-control').forEach(node=>node.remove())"), 'Controls may leak into read mode.');

console.log('Web Report Edit v2 static contract passed.');
