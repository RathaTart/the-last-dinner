import {PricingPlanManagerClient,ListSubscriptionsCommand,CreateSubscriptionCommand,GetSubscriptionCommand} from '@aws-sdk/client-pricing-plan-manager';
import {spawnSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.AWS_PROFILE='codex-tart';
const client=new PricingPlanManagerClient({region:'us-east-1',maxAttempts:2});
function aws(args){const r=spawnSync('aws',[...args,'--profile','codex-tart','--region','us-east-1','--no-cli-pager'],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout);}
if(aws(['sts','get-caller-identity']).Account!=='541099637009')throw Error('Account mismatch');
const stack=aws(['cloudformation','describe-stacks','--stack-name','last-dinner-web']).Stacks[0];
if(stack.StackStatus!=='UPDATE_COMPLETE'&&stack.StackStatus!=='CREATE_COMPLETE')throw Error('Stack not ready');
const output=Object.fromEntries(stack.Outputs.map(o=>[o.OutputKey,o.OutputValue]));
const distribution=`arn:aws:cloudfront::541099637009:distribution/${output.DistributionId}`;
const listed=await client.send(new ListSubscriptionsCommand({}));
let subscription=listed.subscriptionSummaries.find(s=>s.resourceArns.includes(distribution));
if(!subscription){
 if(!output.FirewallArn)throw Error('Deploy WAF before subscribing');
 let token;try{token=JSON.parse(await readFile('.release/free-plan-token.json','utf8')).token;}catch{token=randomUUID();await writeFile('.release/free-plan-token.json',JSON.stringify({token}));}
 subscription=(await client.send(new CreateSubscriptionCommand({planFamily:'CloudFront',planTier:'FREE',approvalMode:'IMMEDIATE',resourceArns:[distribution,output.FirewallArn],clientToken:token}))).subscription;
}else subscription=(await client.send(new GetSubscriptionCommand({arn:subscription.arn}))).subscription;
if(subscription.planTier!=='FREE')throw Error('Refusing a paid plan');
await writeFile('.release/cloudfront-plan.json',JSON.stringify(subscription,null,2));
console.log(JSON.stringify(subscription,null,2));
