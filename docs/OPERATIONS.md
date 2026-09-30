# Operations — The Last Dinner

## Deployment identity

Account: **541099637009 (Tart)**. AWS CLI profile: **codex-tart**. Region: **us-east-1**. Stack: **last-dinner-web**. The default profile belongs to a different account and is never used by these scripts. Access keys remain in the existing Windows AWS credential store. No keys are in source, static assets, screenshots or release archives. The generated session-signing parameter is in the ignored `.release/` directory with restricted Windows ACLs.

Public URL: https://d3imrhbpvqr1t2.cloudfront.net

| Component | Resource |
|---|---|
| CloudFront | E1AYLXEUOEJDQQ |
| Private, encrypted, versioned S3 | last-dinner-web-assets-i1gikqiswsao |
| Lambda | last-dinner-api; Node.js 22, 256 MB, 10 second timeout |
| DynamoDB | last-dinner-web-Quotas-1LGJ8SM5Y1647; on-demand, TTL enabled |
| WAF | last-dinner-edge; CloudFront scope; IP rate rule |
| Logs | /aws/lambda/last-dinner-api; retention 7 days |
| Budget | last-dinner-monthly-10-usd |

S3 and the Lambda URL accept CloudFront OAC access. Anonymous direct-origin requests are denied. Browser POST requests include the SHA-256 body hash required for Lambda OAC signing. API responses and HTML are not cached; `/assets/*` uses managed asset caching. There is no EC2 instance, database server, NAT gateway or provisioned model endpoint.

## Costs and quotas

On October 1, 2026 (Bangkok), the Free Tier API reported **USD 200 remaining credits** and a **PAID/ACTIVE** account plan. The credit expiry September 30, 2027 was supplied by the owner; it was not independently returned by that API. Cost Explorer did not yet have billable data, so there is no verified final invoice total for this work.

The CloudFront distribution and its WAF are subscribed to an **ACTIVE FREE** flat-rate plan: USD 0/month, 1 million requests and 100 GB transfer allowance. AWS documents no overage charges for this plan, but sustained excess traffic can affect delivery performance. The plan includes its associated WAF and a 5 GB S3 storage credit. Other S3 requests, Lambda, DynamoDB and Bedrock usage are separate. [AWS plan documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html).

WAF limits a viewer IP to approximately 600 requests per five minutes. This is an approximate rate rule, not an exact billing cap. The application additionally reserves atomic DynamoDB counters before allowing dialogue through the AI gate:

| Scope | Limit |
|---|---|
| Signed anonymous session | 24 requests, session valid 24 hours |
| Viewer IP | 80 requests per UTC day |
| Whole game | 200 requests per UTC day |
| Whole release, lifetime | 2,000 requests; no automatic reset |

Authored and rejected model answers can also consume a reservation. Clearing a browser save does not reset the global counters. Thai requests classify one of nine approved conversational themes with at most **40 output tokens**; the game supplies the reviewed dialogue. English prose permits at most **260 output tokens**. Requests are aborted after six seconds and not retried. Model calls use `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, with geographic inference within the United States. Context is bounded; only this model and its specific inference profile/three regional foundation-model ARNs are permitted by the Lambda role. The account's first-time Anthropic use-case registration was submitted for this game and access was verified.

The USD 10 budget tracks gross monthly account cost excluding credits/refunds. It appears in the AWS console and has **no email subscribers or automatic shutdown action**. The Lambda error alarm likewise appears in CloudWatch without notification subscribers. These controls are not an account-wide hard spending cap; billing data can arrive late. [AWS Budgets limitations](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html). Do not raise limits or add paid recurring resources without reviewing the current bill.

## Publish an update

```powershell
npm ci
npm run build
npm test
npm audit --omit=dev
node tools/deploy-aws.mjs
```

Publishing bundles Lambda, publishes a numbered function version, stores an immutable static snapshot under `releases/<release-id>/`, updates the root assets and invalidates CloudFront. Deployment manifests are kept in `.release/deployments/`, and `deployment.local.json` identifies the current release. Infrastructure and credentials are never uploaded with static files. Publishing is not atomic across Lambda and S3; verify after deployment.

For infrastructure changes:

```powershell
node tools/deploy-aws.mjs --update-infrastructure --ai-on
aws cloudformation describe-stacks --stack-name last-dinner-web --profile codex-tart --region us-east-1 --query 'Stacks[0].StackStatus'
```

Wait for `UPDATE_COMPLETE` before publishing. Without `--ai-on`, this operation intentionally disables AI. If there are no changes, AWS reports that there are no updates to perform. `node tools/enable-free-plan.mjs` verifies or activates only the FREE plan; it refuses a paid tier. Keep the WAF association while subscribed.

## Rollback

Keep `.release/deployments/` alongside source backups. Pick a manifest with a published `LambdaVersion`, then:

```powershell
node tools/rollback-aws.mjs rc1-YYYY-MM-DDTHH-mm-ss-SSSZ
```

The script restores the published Lambda code and that release's static snapshot, then invalidates CloudFront. It does **not** roll back IAM, environment variables, database schema or infrastructure. This release uses the same save schema (version 2) throughout. Check health and the browser after a rollback; re-publish the intended current release afterward. Original prototype recovery is in `.release/prototype-original.zip`.

## Stop AI immediately

Retrieve the current environment into an ignored local file, modify only `AI_ENABLED` to `false`, and pass it to `lambda update-function-configuration`. Do not overwrite all environment variables with a partial map or log `SESSION_SECRET`. The authored game keeps working. The infrastructure update above without `--ai-on` is a slower, repeatable alternative. Global quota exhaustion also falls back automatically. There is no routine automatic quota reset.

## Diagnosis and recovery

1. Check `/api/health` and `/api/status` through CloudFront. A healthy endpoint does not prove the provider is available; ask an emotional question and check the displayed dialogue mode.
2. Inspect Lambda error metrics and recent CloudWatch logs. Do not add raw chat logging. Provider access, format, timeout and quota failures deliberately return authored dialogue instead of crashing the case.
3. For missing assets, check the deployed snapshot and invalidation status; re-publish from a verified build.
4. Browser saves remain local. Export before clearing browser data. The importer validates and migrates prototype saves, but exported saves are still personal data if players typed personal questions.

Teardown is deliberately not automatic: cancel the free pricing subscription before disabling/deleting the distribution, wait for propagation, then delete this stack. S3 has a retain policy so saved release snapshots survive; assess them separately before removal. DynamoDB contains counters, not cloud saves. Never operate on unrelated account resources.
