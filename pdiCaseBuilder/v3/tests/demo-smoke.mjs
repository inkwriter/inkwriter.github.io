import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCase } from '../js/core/state.js';
import { evaluatePatterns } from '../js/services/pattern-engine.js';
import { buildAiHandoff } from '../js/services/ai-handoff.js';
import { buildHumanReportText } from '../js/modules/reporting.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/patterns-manifest.json'),'utf8'));const patterns=[];
for(const pack of manifest.packs){const rel=path.join(root,'data',pack.src.replace(/^\.\//,''));patterns.push(...JSON.parse(await fs.readFile(rel,'utf8')).patterns)}
const demos=JSON.parse(await fs.readFile(path.join(root,'data/demo-cases.json'),'utf8')).cases;
let fail=0;
for(const demo of demos){const c=normalizeCase(demo.case);const results=evaluatePatterns(c,patterns);const actual=results[0]?.pattern.id||'';const ok=actual===demo.expected_pattern;if(!ok)fail++;const handoff=buildAiHandoff(c);const report=buildHumanReportText(c);if(/undefined|null\b/.test(handoff)||/undefined/.test(report)){console.log(`FAIL ${demo.id}: output contains undefined/null`);fail++;continue}console.log(`${ok?'PASS':'FAIL'} ${demo.id}: expected=${demo.expected_pattern} actual=${actual} confidence=${results[0]?.confidence||'none'}`)}
if(fail)process.exit(1);console.log(`\n${demos.length}/${demos.length} demo cases passed.`);
