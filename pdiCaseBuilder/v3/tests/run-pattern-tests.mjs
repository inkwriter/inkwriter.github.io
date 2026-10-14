import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scorePattern } from '../js/services/pattern-engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(await fs.readFile(path.join(root,'data/patterns-manifest.json'),'utf8'));
const patterns=[];
for(const pack of manifest.packs){
  const packPath=path.join(root,'data',pack.src.replace(/^\.\//,''));
  const data=JSON.parse(await fs.readFile(packPath,'utf8'));
  patterns.push(...(data.patterns||[]));
}
const suite=JSON.parse(await fs.readFile(path.join(root,'data/pattern-tests.json'),'utf8'));
let failed=0;
for(const test of suite.tests){
  const facts={symptom:'',text:'',choices:{},evidence:{},gt:{previous:null,beginning:null,ending:null,skipped:null},...(test.facts||{})};
  facts.evidence ||= {};
  facts.choices ||= {};
  facts.gt ||= {previous:null,beginning:null,ending:null,skipped:null};
  const ranked=patterns.map(p=>scorePattern(p,facts)).sort((a,b)=>b.score-a.score||b.reasons.length-a.reasons.length);
  const actual=ranked[0]?.score>0?ranked[0].pattern.id:'';
  const ok=actual===test.expected;
  if(!ok)failed++;
  console.log(`${ok?'PASS':'FAIL'} ${test.id}: expected=${test.expected} actual=${actual} score=${ranked[0]?.score??0}`);
}
console.log(`\n${suite.tests.length-failed}/${suite.tests.length} pattern tests passed.`);
if(failed)process.exit(1);
