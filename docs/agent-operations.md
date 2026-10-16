# Ngai operations

Ngai now records a versioned run for every request in `agentRuns`, with model and tool events stored below the run. Raw prompts and tool arguments are deliberately not stored by the telemetry layer. The admin-only **Ngai Operations** screen reads the aggregated API at `/api/admin/agent-insights` and provides review controls for proposed `agentMemories`.

## Environment

Set these server-side variables when deploying:

```text
AGENT_JOB_SECRET=<long random secret used for worker-to-agent calls>
CRON_SECRET=<Vercel cron authorization secret>
OPENAI_INPUT_COST_PER_1M_USD=<provider input rate>
OPENAI_OUTPUT_COST_PER_1M_USD=<provider output rate>
```

The cost fields remain zero until the OpenAI rates are configured. This avoids silently baking stale model pricing into the application.

## Durable jobs

Admins can enqueue an agent job with `POST /api/agent/jobs`. Vercel calls `/api/cron/agent-jobs` every minute. Jobs use leases, retry up to `maxAttempts`, and keep the final streamed result in `agentJobs`. The worker invokes the same `/api/agent` route through a server-only secret, so permissions and tool behavior stay aligned with interactive Ngai runs.

## Evaluation

Run the static contract checks locally:

```text
npm run test:agent
```

For live checks, set `AGENT_EVAL_URL` to a deployed test environment and `AGENT_EVAL_TOKEN` to an admin Firebase ID token. The suite checks tool traces, memory proposals, response completion, and a permission-boundary case. Add anonymised production failures to `scripts/agent-eval-cases.mjs` as the regression corpus grows.

## Skills and memory

`lib/agent/registry.ts` contains the versioned tool and skill manifest. Approved memories are scoped and sourced; only approved memories are injected into dashboard runs. Ngai's `remember_style` action now proposes a memory for review instead of silently changing shared behavior.
