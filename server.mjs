import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createApi} from './backend.mjs';
import {bedrockInvoker} from './bedrock.mjs';
const root=fileURLToPath(new URL('./dist/',import.meta.url)),port=Number(process.env.PORT||8795),enabled=process.env.DIALOGUE_PROVIDER==='bedrock';
const api=createApi({enabled,invoke:enabled?bedrockInvoker({region:process.env.BEDROCK_REGION||'us-east-1',model:process.env.BEDROCK_MODEL||'us.anthropic.claude-sonnet-4-5-20250929-v1:0'}):null});
export const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){if(req.headers.origin&&!['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin)){res.writeHead(403,{'Content-Type':'application/json'});res.end('{"error":"Origin rejected"}');return;}let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>10000){res.writeHead(413);res.end();return;}body+=chunk;}const result=await api({path:url.pathname,method:req.method,headers:req.headers,body,ip:req.socket.remoteAddress});res.writeHead(result.status,result.headers);res.end(result.body);return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}const name=decodeURIComponent(url.pathname);if(name.includes('..')||name.includes('\\')||!(/^\/(?:index\.html|app\.js(?:\.LEGAL\.txt)?|style\.css|assets\/[a-zA-Z0-9_./-]+)$/.test(name)||name==='/')){res.writeHead(404);res.end('Not found');return;}
 const file=path.resolve(root,name==='/'?'index.html':'.'+name);if(!file.startsWith(root)){res.writeHead(404);res.end();return;}const contents=await readFile(file);const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.txt':'text/plain','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:contents);
 }catch{res.writeHead(404);res.end('Not found');}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))server.listen(port,'127.0.0.1',()=>console.log(`The Last Dinner: http://127.0.0.1:${server.address().port} (${enabled?'Bedrock':'authored'} dialogue)`));
