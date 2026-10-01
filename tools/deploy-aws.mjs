import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {template} from './infrastructure.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),profile='codex-tart',region='us-east-1',stack='last-dinner-web';
process.chdir(root);
function aws(args,{quiet=false}={}){const result=spawnSync('aws',[...args,'--profile',profile,'--region',region,'--no-cli-pager'],{encoding:'utf8',maxBuffer:10*1024*1024});if(result.status!==0)throw Error(result.stderr||'AWS command failed');if(!quiet&&result.stdout)console.log(result.stdout.trim());return result.stdout;}
const identity=JSON.parse(aws(['sts','get-caller-identity','--output','json'],{quiet:true}));if(identity.Account!=='541099637009')throw Error('Refusing deployment: AWS account mismatch');
await mkdir('.release',{recursive:true});
if(process.argv.includes('--infrastructure')||process.argv.includes('--update-infrastructure')){
 await writeFile('.release/infrastructure.json',JSON.stringify(template(),null,2));
 let secret;try{secret=JSON.parse(await readFile('.release/deploy-parameters.json','utf8'))[0].ParameterValue;}catch{secret=randomBytes(32).toString('hex');}
 await writeFile('.release/deploy-parameters.json',JSON.stringify([{ParameterKey:'SessionSecret',ParameterValue:secret},{ParameterKey:'AIEnabled',ParameterValue:'false'}]));
 aws(['cloudformation','validate-template','--template-body','file://.release/infrastructure.json']);
 const updating=process.argv.includes('--update-infrastructure');
 if(updating)await writeFile('.release/update-parameters.json',JSON.stringify([{ParameterKey:'SessionSecret',UsePreviousValue:true},{ParameterKey:'AIEnabled',ParameterValue:process.argv.includes('--ai-on')?'true':'false'}]));
 aws(['cloudformation',updating?'update-stack':'create-stack','--stack-name',stack,'--template-body','file://.release/infrastructure.json','--parameters',updating?'file://.release/update-parameters.json':'file://.release/deploy-parameters.json','--capabilities','CAPABILITY_IAM','--tags','Key=project,Value=the-last-dinner']);
 console.log('Infrastructure started. Check stack completion before publishing assets.');
}else{
 const result=JSON.parse(aws(['cloudformation','describe-stacks','--stack-name',stack,'--output','json'],{quiet:true})).Stacks[0];if(!['CREATE_COMPLETE','UPDATE_COMPLETE'].includes(result.StackStatus))throw Error('Infrastructure not ready: '+result.StackStatus);
 const output=Object.fromEntries(result.Outputs.map(o=>[o.OutputKey,o.OutputValue]));
 await build({entryPoints:['lambda.mjs'],outfile:'.release/lambda/index.js',bundle:true,minify:true,platform:'node',format:'cjs',target:'node22',legalComments:'none'});
 const zip=spawnSync('powershell',['-NoProfile','-Command',"Compress-Archive -LiteralPath '.release/lambda/index.js' -DestinationPath '.release/lambda.zip' -Force"],{encoding:'utf8'});if(zip.status!==0)throw Error(zip.stderr);
 const code=JSON.parse(aws(['lambda','update-function-code','--function-name',output.FunctionName,'--zip-file','fileb://.release/lambda.zip','--publish','--query','{Status:LastUpdateStatus,Version:Version}','--output','json']));
 const release='rc'+JSON.parse(await readFile('package.json','utf8')).version.split('rc.')[1]+'-'+new Date().toISOString().replace(/[:.]/g,'-');
 aws(['s3','sync','dist/',`s3://${output.Bucket}/releases/${release}/`,'--cache-control','public,max-age=300','--only-show-errors']);
 aws(['s3','sync','dist/',`s3://${output.Bucket}/`,'--cache-control','public,max-age=300','--only-show-errors']);
 aws(['s3','cp','dist/index.html',`s3://${output.Bucket}/index.html`,'--content-type','text/html; charset=utf-8','--cache-control','no-cache','--only-show-errors']);
 aws(['cloudfront','create-invalidation','--distribution-id',output.DistributionId,'--paths','/*','--query','Invalidation.{Id:Id,Status:Status}','--output','json']);
 const manifest={...output,Account:identity.Account,Profile:profile,Region:region,Release:release,LambdaVersion:code.Version,AIEnabled:result.Parameters.find(p=>p.ParameterKey==='AIEnabled')?.ParameterValue==='true'};
 await mkdir('.release/deployments',{recursive:true});
 await writeFile('.release/deployments/'+release+'.json',JSON.stringify(manifest,null,2));
 await writeFile('deployment.local.json',JSON.stringify(manifest,null,2));
 console.log('Published release candidate: '+output.URL);
}
