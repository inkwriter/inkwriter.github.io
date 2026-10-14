import fs from 'node:fs';
import { createEmptyCase } from '../js/core/state.js';
import { chooseNextEvidenceField } from '../js/services/pattern-engine.js';

const schema = JSON.parse(fs.readFileSync(new URL('../data/evidence-schema.json', import.meta.url), 'utf8'));
const c = createEmptyCase();
const first = chooseNextEvidenceField(c, [], schema);
if (!first) throw new Error('Expected an initial evidence field');
c.workflow.skippedEvidence.push(first.id);
const second = chooseNextEvidenceField(c, [], schema);
if (second?.id === first.id) throw new Error(`Skipped field ${first.id} was immediately asked again`);
console.log(`PASS Not sure skip: ${first.id} -> ${second?.id || 'no further field'}`);
