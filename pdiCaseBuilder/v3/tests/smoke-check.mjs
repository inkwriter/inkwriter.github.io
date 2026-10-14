import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['index.html','css/app.css','js/app.js','js/services/pattern-engine.js','data/patterns-manifest.json','data/evidence-schema.json','data/demo-cases.json','data/pattern-tests.json'];
for(const rel of required){await fs.access(path.join(root,rel));console.log(`PASS exists ${rel}`)}
for(const rel of ['data/patterns-manifest.json','data/evidence-schema.json','data/demo-cases.json','data/pattern-tests.json','version.json']){JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));console.log(`PASS JSON ${rel}`)}
const manifest=JSON.parse(await fs.readFile(path.join(root,'data/patterns-manifest.json'),'utf8'));let count=0;for(const pack of manifest.packs){const rel=path.join('data',pack.src.replace(/^\.\//,''));const obj=JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));count+=(obj.patterns||[]).length;console.log(`PASS pack ${pack.id}: ${(obj.patterns||[]).length} pattern(s)`)}
if(count!==12)throw new Error(`Expected 12 patterns, found ${count}`);
console.log(`PASS total patterns: ${count}`);
