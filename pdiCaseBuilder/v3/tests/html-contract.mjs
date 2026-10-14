import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);if(dup.length)throw new Error('Duplicate HTML ids: '+[...new Set(dup)].join(', '));
const app=await fs.readFile(path.join(root,'js/app.js'),'utf8');
const refs=[...app.matchAll(/getElementById\('([^']+)'\)/g)].map(m=>m[1]);
const missing=[...new Set(refs.filter(id=>!ids.includes(id)))];if(missing.length)throw new Error('app.js references missing static ids: '+missing.join(', '));
const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)].map(m=>m[1]);
for(const asset of assets){await fs.access(path.join(root,asset.replace(/^\.\//,'')));console.log('PASS asset',asset)}
console.log(`PASS HTML contract: ${ids.length} unique ids, ${refs.length} app id references.`);
