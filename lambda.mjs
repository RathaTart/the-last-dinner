import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient,TransactWriteCommand} from '@aws-sdk/lib-dynamodb';
import {createApi} from './backend.mjs';
import {bedrockInvoker} from './bedrock.mjs';
import {viewerIp} from './client-ip.mjs';
const db=DynamoDBDocumentClient.from(new DynamoDBClient({maxAttempts:1}));
const store={async reserve(keys){try{await db.send(new TransactWriteCommand({TransactItems:keys.map(({key,limit})=>({Update:{TableName:process.env.QUOTA_TABLE,Key:{pk:key},UpdateExpression:'SET expires = if_not_exists(expires, :ttl) ADD calls :one',ConditionExpression:'attribute_not_exists(calls) OR calls < :cap',ExpressionAttributeValues:{':one':1,':cap':limit,':ttl':key==='all-time'?4102444800:Math.floor(Date.now()/1000)+172800}}}))}));return true;}catch{return false;}}};
const api=createApi({enabled:process.env.AI_ENABLED==='true',invoke:bedrockInvoker({region:process.env.BEDROCK_REGION,model:process.env.BEDROCK_MODEL}),store,secret:process.env.SESSION_SECRET});
export async function handler(event){const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));if(event.cookies?.length)headers.cookie=event.cookies.join('; ');const result=await api({path:event.rawPath,method:event.requestContext?.http?.method,headers,body:event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'',ip:viewerIp(headers,event.requestContext?.http?.sourceIp||'unknown'),secure:true});const output={statusCode:result.status,headers:result.headers,body:result.body};if(result.headers['Set-Cookie']){output.cookies=[result.headers['Set-Cookie']];delete output.headers['Set-Cookie'];}return output;}
