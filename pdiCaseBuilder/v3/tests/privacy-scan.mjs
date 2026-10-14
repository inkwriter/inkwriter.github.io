import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const excluded=new Set(['.git']);
const forbidden=[
  'Rick Hagerman','Jenkins','Whitesburg','Harold','Prestonsburg','Pine Mountain Market','Marrowbone','Elkhorn City','Zebulon','Neon #1',
  '192.168.136.2','PDI_V3_PRIVATE_Pattern_Source_Map','closed_tickets('
];
const textExt=new Set(['.html','.css','.js','.mjs','.json','.md','.txt','.csv','.gitignore']);
let hits=[];
async function walk(dir){for(const ent of await fs.readdir(dir,{withFileTypes:true})){if(excluded.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else if(textExt.has(path.extname(ent.name))||ent.name==='.gitignore'){if(path.relative(root,p)==='tests/privacy-scan.mjs')continue;const txt=await fs.readFile(p,'utf8');for(const needle of forbidden){if(txt.toLowerCase().includes(needle.toLowerCase()))hits.push(`${path.relative(root,p)} -> ${needle}`);}}}}
await walk(root);
if(hits.length){console.error('Privacy scan failed:');hits.forEach(h=>console.error('  '+h));process.exit(1)}
console.log('PASS privacy scan: no curated private identifiers found in public package.');
