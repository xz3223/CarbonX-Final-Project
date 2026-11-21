# Industrial Carbon Twin + Flashpoint
## Final preview: 
An interactive industrial decarbonization application with a geographic screening map, a 3D steel plant, scenario and financial calculations, and Flashpoint stakeholder-research integration. Engineering calculations use the existing deterministic models; synthetic research does not replace those calculations.

## Prerequisites

- Node.js 22.19.0 or newer, including npm.
- A modern browser with WebGL for the 3D view.
- No wallet, environment variables or external account is required for the local application or standalone preview.

## Run locally

From the directory containing this README and package.json:

```sh
npm start
```

Open http://localhost:3000/ and keep the terminal running. Press Ctrl+C to stop. The main application has no external server-side npm dependencies, installation step or compilation step. Three.js r128 is bundled with its license.

If port 3000 is occupied, use another port in PowerShell:

```powershell
$env:PORT='3001'
npm start
```

## Standalone frontend

Download and open `preview.html` directly. This self-contained file includes Home, Map, 3D Plant, and Scenario and Finance views. It works offline without Node or credentials. The Flashpoint Research section displays a saved snapshot with twelve completed records, zero usable answer sets and Analysis blocked. Its action buttons explain how to start the full application; they do not execute requests. Research API loading and imports require the full local application. GitHub's file viewer displays HTML source; download the file or use static hosting to view it. The full Node backend cannot run on GitHub Pages.

## How Flashpoint is used

The app prepares a research brief from the current scenario, links it to the existing Flashpoint survey, and imports saved Flashpoint responses through the backend. The separate wallet client provides authentication, MCP tool discovery and an explicitly approved payment path. It is not invoked by starting the local app.

The real workflow created a seven-question draft, ran twelve AI personas, and retrieved scoped analysis. The saved analysis reports twelve COMPLETE records but empty answer payloads. No usable findings are claimed. A fresh wallet JWT works for MCP discovery but receives HTTP 401 on direct REST response retrieval; whether the original answers exist in storage remains unverified. Synthetic personas are exploratory AI output, not real people or representative market evidence.

## Test Research Insights

Open Scenario and Finance, select Combined, retain default finance and year 2050, then click Generate Research Brief. Survey `fafab667-80e8-4f1d-8a48-5715a1103485` should link to those exact inputs. The saved study displays Analysis blocked with zero usable answer sets. Refresh Saved Results rereads local files only.

Expand Prepare the next synthetic panel (approval required) to prepare, copy or download an unapproved request. Expand Advanced: import completed study results for the optional import field. Requests are not completed results and cannot be imported. Preparation does not run a panel or sign payments.

## Optional live Flashpoint client

```sh
cd flashpoint-client
npm ci
```

Copy `.env.example` to `.env` in that directory and configure your own authorized replacement wallet locally:

| Variable | Local value |
| --- | --- |
| FLASHPOINT_WALLET_KEY | Your private key; never commit it |
| FLASHPOINT_EXPECTED_WALLET_ADDRESS | Matching public wallet address |
| FLASHPOINT_REPLACEMENT_WALLET_CONFIRMED | Set true only after confirming the wallet |

The example contains placeholders only. Free authentication and discovery:

```sh
node flashpoint.mjs tools
```

Client policy tests after installing its dependencies:

```sh
node --test
```

The ordinary client blocks business tools and payments. The separate approved-draft.mjs entry point requires explicit approval of the exact request hash, maximum USDC amount, one business call and zero paid retries. Historical operations do not authorize new operations. Do not commit .env, JWTs, private keys, payment signatures or authorization ledgers.

## Backend result import

After independently approved calls have returned actual saved result files:

```sh
node scripts/import-flashpoint-results.cjs <saved-analysis-result.json> <saved-panel-result.json>
```

This local importer performs no Flashpoint call. It validates survey/scenario/run scope, normalizes actual answers and updates the backend. It never fabricates missing data. It is not needed for ordinary startup.

## Repository layout

- apps/: frontend and Node API.
- packages/: shared calculation models and reference data.
- data/: map scores, saved research and required Flashpoint linkage metadata. Keep flashpoint-seed for research loading and request preparation.
- scripts/: local result-file importer.
- flashpoint-client/: wallet client source, policy tests, dependency lockfile and empty configuration template.
- preview.html: self-contained frontend artifact.

## Submission

Publish the extracted project contents in a public GitHub repository and submit its URL. This README provides local setup instructions and links to the frontend artifact above. Confirm the competition's Section B format separately; add the required primary submission artifact or its link here. An optional demo video must be at most three minutes; add its real URL when available. No video is included in this repository.
