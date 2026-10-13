# Ear to Mind Assistant

A research workspace with private, account-owned projects for interviews, cognitive statement practice, and mental model mapping. English UI, neutral colors, Arial/Helvetica typography.


## Live website

- **Website:** https://Blair-Su.github.io/Ear-to-Mind/
- **Interactive demo:** https://Blair-Su.github.io/Ear-to-Mind/demo/
- **Product entry:** https://Blair-Su.github.io/Ear-to-Mind/workspace/
- **Hosted product:** https://mental-model-studio.clever-flint-5576.chatgpt.site/workspace

The homepage’s **Try the assistant** links open the signed-in product. **See the demo** opens the standalone interactive demo without an account. The full product source, demo source, and website source all live in this repository.

GitHub Pages serves the static website and demo from `main` → `/docs`. The product entry redirects to the existing Sites deployment, which provides ChatGPT sign-in, the database, and the research plugin. GitHub Pages does not execute the server or host its database. Research data and login credentials are never stored in this repository.

After editing the shared UI or marketing files, run `npm run build:pages` and commit the generated files under `docs/` with the source changes. Pages publishes them on the next push. Deploy backend changes separately through Sites. `docs/.nojekyll` keeps the generated files unchanged.

## Product

- Landing page at `/`; signed-in product at `/workspace`.
- Research projects with durable, account-owned D1 storage.
- Paste or import `.txt` / `.md` interview notes, keep speaker labels, record consent, and save selected quotes.
- Quote library with search, original source links, and manual quote entry.
- Statements with four lenses, six researcher-reviewed checks, saved revisions, and explicit local wording hints.
- Mental spaces and towers, drag/drop and accessible placement menus, per-tower support opportunities, SVG export.
- Project JSON export/import. Import creates a separate project; exported coaching history is preserved in the export, not reattached to imported records.
- Optimistic revision checks prevent silent cross-window overwrites. An unsaved local draft is retained for recovery; exports remain available on save failure.

## ChatGPT coaching

This release uses the current platform through a Site-managed personal MCP plugin. It does not call an API with an embedded key and does not run a model automatically inside the website.

1. Connect the Ear to Mind plugin in **Plugins > Personal > Created by you**.
2. In the product, prepare a statement, interview, question, or map review.
3. Copy the request into your ChatGPT conversation with the connected plugin.
4. ChatGPT reads that saved snapshot, follows the coaching instructions, and saves feedback to the pending request.
5. The product refreshes feedback every 12 seconds while visible; manual Refresh is available in ChatGPT coach.

`POST /mcp` exposes:
- `list_research_projects` — names/counts belonging to the signed-in user.
- `list_coaching_requests` — pending requests explicitly created in the product.
- `get_coaching_request` — immutable review snapshot and coaching instructions.
- `submit_coaching_feedback` — validated feedback only; no research rewriting or regrouping.

Six rubric judgments are required for statement feedback. The coach returns one strength, one primary improvement, and one guiding question. Research text is treated as untrusted evidence, never as instructions. Completed requests are immutable; retrying the identical response is idempotent.

There is no live audio recording, automatic transcription, or speaker recognition. Interview support is based on explicitly imported or pasted text. Hosted plugin installation and the authenticated round trip must be verified in the owner's ChatGPT session.

## Development

Use Node >=22.13.0. This project was migrated from a static Site to the supplied Sites Vinext starter. Keep the `.openai/hosting.json` project identity and Vite/Worker wiring intact.

```sh
npm run dev -- --port 4173 --hostname 127.0.0.1
```

Local development only: `/signin-with-chatgpt?return_to=/workspace` signs in as the starter's simulated user. Production authentication is handled by Sites dispatch; local auth is excluded from builds. User ownership always comes from trusted dispatch identity, never request bodies.

Schema is in `db/schema.ts`; generated migrations are committed under `drizzle/`. Use the Sites build helper, then apply the migration to local D1:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_soft_tony_stark.sql
```

Never run schema creation during requests. Sites applies the committed migration to production at deployment. Runtime secrets belong in native Sites environment configuration; none are required for the MCP coaching flow.

## Verification

```sh
npm run typecheck
npm test
# With the local development server and migrated D1 running:
node --experimental-strip-types --test tests/api.test.mjs
```

The HTTP integration test creates and removes only its own temporary local project. It verifies authentication, same-origin writes, persistence/readback, revision conflicts, review snapshots, duplicate-request handling, schema validation, feedback readback, completion idempotency, cancellation, consent gating, and cleanup. Test feedback is explicitly labeled as a fixture, not AI output.

The website is public; `/workspace`, project APIs, and research MCP operations require sign-in. Each stored project and review is scoped to the authenticated user. Publishing the dynamic product follows the Sites source helper and native deployment workflow. Browser automation was unavailable during this implementation; server-rendered output and API behavior were checked, but interactive browser and authenticated hosted ChatGPT integration remain unverified.

## Interactive demo

`/demo` opens a separate browser-local workspace with two fictional interviews, six quotes, six statements, editable mental spaces, and clearly labeled scripted coaching. No application sign-in, plugin, API, or database call is used. The demo is publicly accessible without signing in. Demo data uses its own local storage key and can be reset without touching real projects. If storage is unavailable, the demo uses session memory.

For an entirely offline version, open `public/downloads/mental-model-demo.html` in a modern browser. It bundles the UI, React, data, and CSS into one file. A Content Security Policy disables all network connections. Rebuild it after UI changes with `npm run build:demo`. Run `npm run test:demo` to verify demo persistence, isolation, local coaching, reset, and deletion.

## Guided onboarding

Every workspace destination remains available before a project exists. Short empty states offer project creation or “Show me around”; the sidebar has a “Guided tour” entry.

The tour uses six small coachmarks anchored to actual controls, starting beside the Interviews navigation item. Each contains a short explanation, a back icon, Next, a sound toggle, and a close icon. Only the current target is highlighted; the page remains interactive. The card tracks scrolling and resizing, docks on narrow screens, and hides while a native dialog is open. Escape closes the tour. No required assignments or large instruction panels are shown.

A prepared fictional project and scripted feedback let users follow the whole workflow immediately. Optional edits and tour progress persist in separate browser storage. Existing demo data, real projects, and previous tutorial practice remain separate. Restart affects only the current tour example.

Run `npm run test:tutorial` to check sample data, available tour targets, positioning at viewport edges, progress recovery, and storage isolation. See [the video storyboard](docs/tutorial-storyboard.md) for the corresponding promotional sequence. Browser-based visual and interaction verification is still outstanding.

## Brand assets

The supplied Ear to Mind symbol and full logo are preserved in `public/marketing/assets/`. Navigation uses the transparent symbol with a white CSS silhouette on dark backgrounds; the adjacent name supplies its accessible label. The demo embeds the same symbol and favicon so it remains fully offline. The full lockup is used in the portfolio film on a matching light background.
