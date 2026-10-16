import { readFile } from "node:fs/promises"
import { cases } from "./agent-eval-cases.mjs"

const baseUrl = (process.env.AGENT_EVAL_URL || "").replace(/\/$/, "")
const token = process.env.AGENT_EVAL_TOKEN || ""

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function staticChecks() {
  const route = await readFile(new URL("../app/api/agent/route.ts", import.meta.url), "utf8")
  const required = ["query_workspace", "workspace_summary", "collect_details", "generate_campaign_parts", "PORTAL_TOOLS", "requireAgencyId", "startAgentRun", "recordAgentToolEvent"]
  for (const marker of required) assert(route.includes(marker), `Agent contract is missing ${marker}.`)
  console.log(`agent-eval: ${cases.length} cases loaded; static contract checks passed`)
}

async function liveChecks() {
  assert(baseUrl && token, "Set AGENT_EVAL_URL and AGENT_EVAL_TOKEN to run live evaluations.")
  for (const testCase of cases) {
    const response = await fetch(`${baseUrl}/api/agent`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ surface: "agency_dashboard", messages: [{ role: "user", content: testCase.prompt }] }),
    })
    const output = await response.text()
    assert(response.ok, `${testCase.id}: agent returned ${response.status}`)
    assert(output.includes("␞::ngai-answer::"), `${testCase.id}: response did not finish with an answer marker`)
    const answer = output.split("␞::ngai-answer::").at(-1)?.toLowerCase() || ""
    for (const expected of testCase.expectedOutput || []) assert(answer.includes(expected), `${testCase.id}: expected output to include ${expected}`)
    for (const forbidden of testCase.forbiddenOutput || []) assert(!answer.includes(forbidden), `${testCase.id}: output contained forbidden text ${forbidden}`)
    const runId = response.headers.get("x-agent-run-id")
    if (runId) {
      const runResponse = await fetch(`${baseUrl}/api/agent/runs/${runId}`, { headers: { authorization: `Bearer ${token}` } })
      const run = await runResponse.json()
      const toolNames = (run.events || []).map((event) => event.toolName).filter(Boolean)
      for (const expectedTool of testCase.expectedTools || []) assert(toolNames.includes(expectedTool), `${testCase.id}: expected tool ${expectedTool}, got ${toolNames.join(", ")}`)
    }
    console.log(`agent-eval: ${testCase.id} passed`)
  }
}

await staticChecks()
if (baseUrl && token) await liveChecks()
else console.log("agent-eval: live checks skipped; provide AGENT_EVAL_URL and AGENT_EVAL_TOKEN in a deployed test environment")
