# VentureQuest AI

**Global AI Crowdfunding & Venture Simulator** — a free, runnable prototype where builders shape startup ideas with an AI co-founder, explore a fictional innovation market, and try optional PayPal Sandbox checkout.

**Live demo:** [https://venturequest-ai.onrender.com/](https://venturequest-ai.onrender.com/)

**Source code:** [GitHub repository](https://github.com/maneekongritphichayaporn-creator/venturequest-ai) · **License:** MIT

> **Demo scope:** VentureQuest is a learning game, not a crowdfunding or investment service. Sandbox payments are test transactions. The app does not sell equity, promise returns, calculate real ROI, or send automatic investor payouts.

The interface works with Node.js alone. It has no package dependencies, database, paid API requirement, or build step. Local coaching and no-payment demo signals work offline after the page loads. Optional integrations use PayPal Sandbox and a local Ollama model; the app sends no venture information to a cloud AI provider.

## Run it

1. Install Node.js 18 or newer.
2. Open this folder in VS Code.
3. In the integrated terminal, run:

   ```powershell
   node server.js
   ```

4. Open <http://localhost:4173>.

Use `Ctrl+C` in the terminal to stop the server. The server uses only Node's built-in modules.

## Quick demo walkthrough

1. **Create:** Select **Start a venture**, fill in the idea, and choose **Coach my idea**.
2. **Publish:** Review the AI draft, score, strengths, risks, and suggested experiment; select **Add to simulated market**.
3. **Explore:** Open the new card, inspect its pitch, and run the 90-day simulation.
4. **Signal:** Use a no-payment demo signal, or complete an optional PayPal Sandbox Checkout if credentials are configured.
5. **Enter the city:** Open **Enter 3D district**, meet a founder, and try the crisis-event button. A local supporter badge appears after a successful Sandbox Checkout in that browser; coin rain is visual only.

For a no-credentials presentation, steps 1–3 and 5 work with the built-in coach; step 4 can use the points-only demo signal.

## Free integrations

### Local AI coach (default)

The built-in coach works without an API key or internet connection. It uses a transparent heuristic to produce a starter score, a value proposition, a one-line pitch, a business model hypothesis, and a first user experiment. These are lightweight local drafts, not a trained model, market forecast, or investment recommendation. The Live Pitch Arena also uses browser speech synthesis for spoken pitches at no cost. Founder Q&A calls Ollama locally when available and otherwise uses a clearly labelled contextual fallback. After a local demo signal or scenario, Ollama can create a fictional simulation briefing; the hosted fallback uses a clearly labelled template.

### Optional Ollama local model (free)

For a full language model without sending venture details to a cloud AI service, install [Ollama](https://ollama.com/download), then download and run the default model once:

```powershell
ollama run qwen2.5:1.5b
```

Ollama exposes a local API on `127.0.0.1:11434` using its [chat endpoint](https://docs.ollama.com/api/chat). Restart VentureQuest after Ollama is ready; the AI co-founder can draft a value proposition, target user, business model hypothesis, short pitch, and first experiment alongside the feasibility review. If Ollama is unavailable, the app uses the local coach drafts. The model download is about 1 GB, uses disk space, and needs enough memory to run. Ollama runs on your computer; Render uses the built-in local coach instead. The [Qwen2.5 model page](https://ollama.com/library/qwen2.5) lists the 1.5B variant and notes that it uses Apache 2.0.

### PayPal Sandbox Checkout (optional)

The browser loads PayPal JavaScript SDK v6 from PayPal Sandbox using the app client ID. The server keeps the secret private and handles Orders v2 create/capture calls. The server is hardcoded to create and capture orders against PayPal's Sandbox REST API; it cannot be switched to the live API. The secret never leaves the server.

1. Create a free PayPal Developer account and a Sandbox REST app.
2. In the VS Code PowerShell terminal, set the Sandbox credentials:

   ```powershell
   $env:PAYPAL_CLIENT_ID="your-sandbox-client-id"
   $env:PAYPAL_CLIENT_SECRET="your-sandbox-secret"
   node server.js
   ```

3. Sign in to checkout with a Sandbox personal/buyer account from the PayPal Developer Dashboard.

To enable the optional $1 Sandbox award, also set the PowerShell environment variable PAYPAL_PAYOUT_TEST_EMAIL to a Sandbox personal account email before starting Node. For actual webhook delivery, set PAYPAL_WEBHOOK_ID to the ID associated with the listener URL; see the Webhooks section below.

Without credentials, use **Record a no-payment demo signal** to exercise the market flow. It does not call PayPal or charge a payment method. When Sandbox checkout is configured, the AI coach suggests a small test amount based on the venture's simulated score and listed risks; the visitor can change it and must approve checkout. A completed Sandbox capture is confirmed by the server before it updates the demo signal and sends an AI next-experiment tip. Sandbox payments are test transactions only: they do not fund a real venture, create ownership, or promise a return. For a public host, set `HOST=0.0.0.0` in that host's environment; the local default binds only to this computer.

### Postman Sandbox collection (optional)

Import [postman/VentureQuest-Sandbox.postman_collection.json](postman/VentureQuest-Sandbox.postman_collection.json) into Postman. Start VentureQuest with Sandbox credentials configured as above, then run **Read Sandbox configuration** and **Create Sandbox order**. Copy the returned order ID, open `https://www.sandbox.paypal.com/checkoutnow?token=ORDER_ID` in a browser, replace `ORDER_ID`, and approve with a Sandbox buyer account. Set that ID in the collection variable `orderId`, then run **Capture approved Sandbox order**; an unapproved order cannot be captured. The optional payout request sends a fixed $1 Sandbox award only when a Sandbox recipient is configured. Keep credentials in server environment variables; do not save them in the collection or commit them.

The collection targets the local app at http://localhost:4173 by default. Change the baseUrl collection variable if the server uses another host or port. It contains no API keys or secrets.

### PayPal Webhooks (optional)

The webhook receiver is already implemented at `POST /api/paypal/webhook`; no extra webhook code is needed for this demo. In the same PayPal Sandbox REST app, register `https://venturequest-ai.onrender.com/api/paypal/webhook`, subscribe to `PAYMENT.CAPTURE.COMPLETED`, then set `PAYPAL_WEBHOOK_ID` in Render to the webhook ID. The server verifies each event with PayPal before emitting the market update to open browser sessions. Checkout capture already updates the signal directly; the webhook is an optional verified notification path and helps demonstrate PayPal's event flow. Webhooks are asynchronous, and the demo's in-memory de-duplication/state can reset on service restart. Local webhook delivery needs a public HTTPS host or tunnel because PayPal cannot reach `127.0.0.1`.

### PayPal Sandbox Payouts (optional)

Set PAYPAL_PAYOUT_TEST_EMAIL to a personal Sandbox recipient account. When PayPal Sandbox credentials and the receiver are configured, the pitch view shows Send $1 Sandbox game award. The endpoint sends a fixed USD 1.00 Sandbox payout and never uses a live API host. Payouts access must be enabled for the Sandbox app. This is a user-triggered test award, not an investor dividend or a real-world return.

## What the prototype does

- **Builder:** Submit a venture name, user problem, audience, category, solution, and sustainability model.
- **AI co-founder:** Get a feasibility review plus drafts for a value proposition, target user, business model hypothesis, one-line pitch, and first experiment. Uses Ollama locally when available and a transparent heuristic otherwise.
- **Virtual Innovation City:** Open `/world` for a dedicated Three.js district with WASD/arrow movement, touch controls, founder booths, animated building levels, fictional visitor bots, and a market stress test every two minutes or by button. Deterministic game rules use each venture's AI feasibility score to apply fictional category impacts; Ollama can narrate the supplied results. Positive outcomes trigger a visual coin rain. A local Sandbox Supporter badge appears above the player after that browser completes PayPal Sandbox checkout.
- **Live Pitch Arena:** Listen to a browser-spoken 30-second pitch, ask typed questions or use supported browser voice input, and view an animated concept card. Ollama answers founder questions locally when available; the hosted demo uses a contextual fallback.
- **AI simulation ticker:** After a demo signal or simulation, Ollama can draft a fictional briefing. No external news, real market feed, or real company data is used.
- **Agent-to-agent bid demo:** A fictional explorer agent negotiates a 5-point community signal with the founder. Accepting it records points only; it does not move money or create ownership.
- **Interactive market board:** A local simulated ticker, illustrative trend line, fictional region map, and Hall of Fame with clearly labelled game scores and badges. Data comes from the current browser and is not a global leaderboard or real-time market feed.
- **Sandbox award celebration:** If a Sandbox payout recipient is configured, the pitch arena offers a user-triggered fixed $1 test award and celebration. Crisis coin rain is visual only and never triggers Payouts. It is not a dividend, cash-out based on simulation, or investment return.
- **Pitch details:** View a venture's problem, audience, solution, sustainability model, AI strengths, risks, and suggested experiments before supporting it.
- **90-day market simulation:** Compare a community tailwind, steady market, and competitor pressure through illustrative interest and repeat-use indices, with a suggested experiment for each scenario.
- **Experiment log:** Save a scenario-specific experiment plan and revisit the latest five plans from the venture pitch. Plans are stored locally in browser storage.
- **No-payment simulated market:** Browse, filter, and sort example ventures. Record a community signal in points without moving money. Published ventures and signals are saved in browser local storage.
- **AG Grid Community comparison:** Switch from cards to a sortable and filterable venture table with AI score, simulated signals, explorers, and days remaining. The free Community grid loads from jsDelivr only when selected, so the optional view needs an internet connection.
- **AI + PayPal demo loop:** The coach suggests a small $1–$10 Sandbox test amount from the venture's simulated score and risks. The visitor chooses the amount and approves PayPal Checkout. After the server confirms a completed capture, the market signal updates and the AI's suggested next experiment is shown. Without credentials, the no-payment signal path remains available.

## Implementation status

This table separates working demo features from the larger product concept:

| Area | In this prototype | Not implemented yet |
| --- | --- | --- |
| **AI co-founder / business architect** | Ollama-local drafts or a free heuristic create a value proposition, target user, business-model hypothesis, pitch, and experiment. CSS concept visuals are included. | Image generation, generated production-ready code, and validated market research. |
| **Feasibility and risk evaluator** | Simulated score, strengths, risks, and next steps appear in the builder, pitch view, and AG Grid comparison. | Probability of success, competitor analysis, and live trend data. |
| **Market simulator** | 90-day what-if cards and 3D crisis events use illustrative rules informed by the AI score; Ollama can narrate supplied outcomes. | Real economic data, real user behavior, revenue forecasts, ROI, or yield. |
| **PayPal Checkout and webhooks** | Optional Sandbox order/capture flow; optional signature-verified webhook notifications and browser updates. | Live payments, real fundraising, a persistent shared transaction ledger, and investor accounts. |
| **Payouts** | Optional manual fixed $1 Sandbox award to the one recipient configured by the operator. | AI-approved, automatic, or investor-specific payouts and dividends. Crisis coin rain is visual only. |
| **3D supporter badge** | Local Sandbox Supporter badge after a completed Sandbox Checkout in that browser. | Shared identity, transferable credentials, or proof of real ownership. |

## Future roadmap

These are possible next steps, not features currently delivered:

1. **Shared demo data:** Add a free-tier database and user identity so ventures, support signals, and badges can sync across browsers.
2. **More explainable AI analysis:** Separate generated suggestions from rule-based scoring, show score explanations, and use cited market data only if a reliable source is added.
3. **Generated venture assets:** Add optional image generation and a safe preview/export workflow for concept art or prototype scaffolds.
4. **Multiplayer city:** Sync player presence and city updates across sessions.
5. **Payment activity ledger:** Persist order, capture, and webhook records with idempotency and visible transaction status.
6. **Payout flow redesign:** Consider recipient-specific Sandbox awards only after the app can identify eligible recipients with consent and explain the award. Any real-money payout, investment, or return feature needs a separate product and compliance review. Crisis events should remain simulations and must not autonomously promise or pay investment returns.

## Safety and scope

This prototype does not offer securities, equity, lending, investment advice, cash returns, escrow, or actual investment payouts. Community signal points, crisis effects, badge, and coin rain are illustrative game elements saved or displayed in each browser; they are not investments, a shared global ledger, or a payout. The Virtual City is a single-browser demo with local visitor bots, no multiplayer movement sync, and no shared server-side game database. The optional $1 Payouts integration only sends a user-triggered test award to the single Sandbox recipient configured by the operator; it is not sent to each supporter and is not simulated ROI or a dividend. A real crowdfunding product involving money or financial returns would require a separate legal, compliance, fraud, and payment design review before launch.

Scores are idea-coaching prompts, not evidence that a company is viable. The example projects and market metrics are fictional. Browser local storage is not shared between users and can be cleared by the browser.

The 90-day simulation and arena ticker use illustrative game math only. The trend line and fictional regional dots do not show real markets, countries, users, or PayPal activity. The Hall of Fame uses a simulated impact score, not measured outcomes. Nothing estimates revenue, ROI, or investment returns.

## API routes

| Route | Purpose |
| --- | --- |
| `GET /` | VentureQuest dashboard |
| `GET /world` | Dedicated 3D Venture Metropolis page |
| `GET /api/config` | Public client configuration and enabled Sandbox features |
| `GET /api/events` | Server-Sent Events for verified market updates |
| `POST /api/evaluate` | Ollama local model when available; otherwise local coach and venture drafts |
| `POST /api/founder/answer` | Answer a pitch question with Ollama locally when available; otherwise a contextual founder fallback |
| `POST /api/market/briefing` | Draft a fictional market simulation headline locally with Ollama, or return a labelled template |
| `POST /api/paypal/order` | Create a Sandbox Checkout order ($1–$10) |
| `POST /api/paypal/capture` | Capture an approved Sandbox order and emit a market signal |
| `POST /api/paypal/webhook` | Verify and process PayPal Sandbox webhook events |
| `POST /api/paypal/payout` | Send a fixed $1 Sandbox game award to the configured Sandbox recipient |

## Tools used

- **PayPal JavaScript SDK v6 + Orders v2 REST API:** Optional Sandbox checkout and server-side capture.
- **AG Grid Community:** Optional sortable and filterable venture comparison view. The Community edition is free for production use; this prototype loads the pinned CDN build only when the table view is selected.
- **Postman:** Optional collection for the local Sandbox configuration, order, capture, and payout routes.
- **PayPal Webhooks:** Signature-verified capture events update open game sessions through Server-Sent Events.
- **PayPal Payouts v1:** Optional fixed $1 Sandbox game award to a configured Sandbox recipient.
- **Ollama + Qwen2.5 1.5B:** Optional free, locally run LLM; project details stay on the machine.
- **Local heuristic AI coach and founder fallback:** Included, free, and usable offline when no model is available.
- **Browser Web Speech APIs:** Optional free text-to-speech and supported-browser voice input for the pitch arena.
- **CSS concept visualizer and simulated arena board:** No image-generation API, paid chart service, or location data is required.
- **Three.js 0.187.0:** Optional 3D world renderer loaded from jsDelivr only on `/world`. The rest of the dashboard does not load Three.js. The 3D page needs an internet connection for the CDN and a browser with WebGL support.
- **Node.js built-in HTTP server:** Serves the prototype and keeps optional credentials server-side.

## Project files

| File | Role |
| --- | --- |
| `index.html` | Main dashboard, venture builder, market, pitch details, and scenario simulation. |
| `server.js` | Dependency-free Node server, AI fallback/Ollama routes, PayPal Sandbox APIs, webhook verification, and event stream. |
| `payments.js` | Browser-side PayPal event updates and optional award control. |
| `arena.js`, `arena.css` | Live Pitch Arena, Q&A, voice controls, negotiation demo, and market board. |
| `world.html`, `world.js`, `world.css` | Three.js city, founder interactions, crisis simulation, badge, and visual effects. |
| `.env.example` | Reference list of optional environment variable names; it is not loaded automatically. |
| `render.yaml` | Render service configuration. |
| `postman/VentureQuest-Sandbox.postman_collection.json` | Optional requests for the Sandbox API flow. |
| `LICENSE` | MIT License. |

## Public repository and hosting

This folder includes an MIT license and can be published as a public repository. For a free Render demo, create a Node Web Service from the connected repository and set the build command to `node --version`, start command to `node server.js`, plan to `Free`, and `HOST` environment variable to `0.0.0.0`. Render provides `PORT` automatically. Add PayPal Sandbox credentials through the Render dashboard only if you want hosted Sandbox checkout; never put `PAYPAL_CLIENT_SECRET` in browser code, a Blueprint file, or Git.

Render's free web services sleep after 15 minutes without inbound traffic and take about a minute to wake. Their filesystem is ephemeral, and this prototype has no shared database: venture data stays in each visitor's browser storage, while in-memory order and webhook state can reset when the service restarts. Ollama is local-only and will not be available on Render; the built-in heuristic coach remains available.
