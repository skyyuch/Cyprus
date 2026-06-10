# Cyprus microsite — AWS deployment (CDK)

Deploys the booth microsite to AWS:

- **S3** (private) holds the built static site (`dist/`).
- **CloudFront** serves it over HTTPS (Origin Access Control).
- **Lambda** implements `POST /api/agent` (the Claude proxy). It's reachable only
  through CloudFront (Function URL with IAM auth + OAC), and holds
  `ANTHROPIC_API_KEY` as an env var — the key never reaches the browser.

Default region: `ap-southeast-1` (override with `CDK_DEFAULT_REGION`).

## Prerequisites

- AWS CLI logged in (this account uses SSO): `aws sso login` (or `--profile <name>`).
- Node 20+.
- Your Anthropic key in the `ANTHROPIC_API_KEY` env var at deploy time.

## One-time per account/region: bootstrap

```bash
cd infra
npm install
ANTHROPIC_API_KEY=dummy npx cdk bootstrap          # dummy is fine for bootstrap only
```

## Deploy

Always build the site first (the stack uploads `dist/`):

```bash
# from the repo root
npm install
npm run build

# then deploy the infra
cd infra
npm install                                        # first time only
ANTHROPIC_API_KEY=sk-ant-... npm run deploy        # optionally ANTHROPIC_MODEL=claude-sonnet-4-5
```

On success CDK prints `CyprusAetherStack.SiteURL` — the public CloudFront URL.
Open it and test **Ask Aether**.

## Update the site later

```bash
npm run build            # repo root
cd infra && ANTHROPIC_API_KEY=sk-ant-... npm run deploy   # re-uploads dist + invalidates CDN
```

## Rotate the key

Re-run `deploy` with the new `ANTHROPIC_API_KEY` (it updates the Lambda env var).

## Tear down

```bash
cd infra
ANTHROPIC_API_KEY=dummy npm run destroy
```

## Notes

- The key is passed at **deploy time** via env and stored as a Lambda environment
  variable (encrypted at rest). For stricter handling, switch it to AWS Secrets
  Manager / SSM Parameter Store and read it at runtime.
- A custom domain (e.g. `cyprus.xsyphon.com`) needs an ACM certificate in
  **us-east-1** plus `domainNames` + `certificate` on the Distribution — not wired
  up yet; ask if you want it.
- `npm run lint` at the repo root excludes `infra/` (CDK has its own toolchain).
