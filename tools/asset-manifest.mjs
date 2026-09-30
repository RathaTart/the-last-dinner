import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function files(dir){const list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=dir+'/'+entry.name;if(entry.isDirectory())list.push(...await files(name));else list.push(name);}return list;}
const records=[];
for(const file of (await files('assets')).sort())records.push({file,bytes:(await stat(file)).size,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});
await writeFile('docs/ASSET-MANIFEST.json',JSON.stringify({generated:new Date().toISOString(),files:records},null,2));
console.log(records.length+' licensed asset files registered');
