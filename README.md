# DSTAProjectMockup
DSTA project mockup

## Production verification

Use Node.js 22 (see `.nvmrc`) and pnpm 10.34.5 (see `packageManager`).
The deployment package manager is pnpm; update and commit `pnpm-lock.yaml`
whenever dependencies change. `package-lock.json` is retained for npm users.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:production
pnpm start
```

Set the hosting project's root directory to the repository root, install command
to `pnpm install --frozen-lockfile`, and build command to `pnpm build`.
Use the provider's Next.js preset, or run `pnpm start` on a Node.js server.
Do not configure this app as a Jekyll site or a static `out/` export: it has
dynamic Next.js pages and API routes. The existing legacy GitHub Pages pipeline
does not deploy the application.

`Verify production build` checks installation, tests, production build, and
HTTP/asset smoke tests on Linux. Passing that workflow is a pre-deployment check,
not confirmation that an external hosting provider has published the site.
The localStorage demo builds without environment secrets. Optional cloud/AI
features need their own provider configuration; do not commit real credentials.

The current Next.js 14 dependency also requires a separately tested security
upgrade before public production use; successful builds do not resolve that risk.
