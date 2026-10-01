import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const release=process.argv[2];
if(!/^rc[1-9][0-9]*-[0-9TZ-]+$/.test(release||''))throw Error('Pass a release ID from .release/deployments/');
const manifest=JSON.parse(await readFile('.release/deployments/'+release+'.json','utf8'));
function aws(args){const r=spawnSync('aws',[...args,'--profile','codex-tart','--region','us-east-1','--no-cli-pager'],{encoding:'utf8',maxBuffer:10*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
if(JSON.parse(aws(['sts','get-caller-identity'])).Account!=='541099637009'||manifest.Account!=='541099637009')throw Error('Account mismatch');
if(!manifest.LambdaVersion||!/^\d+$/.test(manifest.LambdaVersion))throw Error('Release has no published Lambda snapshot');
const config=JSON.parse(aws(['lambda','get-function','--function-name',manifest.FunctionName,'--qualifier',manifest.LambdaVersion]));
// The presigned code URL is kept in memory and never logged.
const response=await fetch(config.Code.Location);if(!response.ok)throw Error('Cannot recover Lambda code');
await writeFile('.release/rollback-code.zip',Buffer.from(await response.arrayBuffer()));
aws(['lambda','update-function-code','--function-name',manifest.FunctionName,'--zip-file','fileb://.release/rollback-code.zip']);
aws(['s3','sync',`s3://${manifest.Bucket}/releases/${release}/`,`s3://${manifest.Bucket}/`,'--cache-control','public,max-age=300','--only-show-errors']);
aws(['s3','cp',`s3://${manifest.Bucket}/releases/${release}/index.html`,`s3://${manifest.Bucket}/index.html`,'--cache-control','no-cache','--content-type','text/html; charset=utf-8','--only-show-errors']);
aws(['cloudfront','create-invalidation','--distribution-id',manifest.DistributionId,'--paths','/*']);
await writeFile('deployment.local.json',JSON.stringify({...manifest,RolledBackAt:new Date().toISOString()},null,2));
console.log('Restored code and browser assets: '+release+'; infrastructure remains at its current configuration.');
