import {build} from 'esbuild';
import {mkdir,readFile,writeFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
await mkdir(path.join(root,'dist'),{recursive:true});
await build({entryPoints:[path.join(root,'app.js')],outfile:path.join(root,'dist/app.js'),bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'linked'});
let html=await readFile(path.join(root,'index.html'),'utf8');html=html.replace(/<script type="importmap">.*?<\/script>/,'');
await writeFile(path.join(root,'dist/style.css'),(await readFile(path.join(root,'style.css'),'utf8')).replace(/^@import\s+url\([^)]*\);/,'')+'\n'+await readFile(path.join(root,'fonts.css'),'utf8')+'\n'+await readFile(path.join(root,'production.css'),'utf8'));
await cp(path.join(root,'assets'),path.join(root,'dist/assets'),{recursive:true});
for(const file of ['app.js','style.css']){
 const hash=createHash('sha256').update(await readFile(path.join(root,'dist',file))).digest('hex').slice(0,16);
 html=html.replace('/'+file+'"','/'+file+'?v='+hash+'"');
}
await writeFile(path.join(root,'dist/index.html'),html);
console.log('Built browser release in dist/');
