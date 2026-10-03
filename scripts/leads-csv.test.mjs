import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { parseLeadsCsv } from "../lib/leads-csv.ts"

test("the downloadable sample contains importable example leads", async () => {
  const csv = await readFile(new URL("../public/leads-sample.csv", import.meta.url), "utf8")
  const result = parseLeadsCsv(csv)
  assert.equal(result.leads.length, 2)
  assert.deepEqual(result.skipped, [])
  assert.equal(result.leads[0].name, "Ada Okafor")
})

test("imports quoted commas, line breaks, BOM, and common column names", () => {
  const csv = '\ufeffFull Name,Company,Email Address,Value,Notes,Status\r\n"Ada Lovelace","Analytical, Ltd",ada@example.com,"₦1,250.50","Asked for\nproposal",Qualified\r\n'
  const result = parseLeadsCsv(csv)
  assert.equal(result.leads.length, 1)
  assert.deepEqual(result.skipped, [])
  assert.deepEqual(result.leads[0], {
    name: "Ada Lovelace",
    company: "Analytical, Ltd",
    email: "ada@example.com",
    phone: "",
    address: "",
    category: "",
    reviews: "",
    source: "",
    value: 1250.5,
    notes: "Asked for\nproposal",
    stage: "qualified",
  })
})

test("combines first and last name and defaults optional columns", () => {
  const result = parseLeadsCsv("First Name,Last Name,Phone\nJide,Pinheiro,08012345678")
  assert.equal(result.leads[0].name, "Jide Pinheiro")
  assert.equal(result.leads[0].phone, "08012345678")
  assert.equal(result.leads[0].stage, "new")
})

test("recognises common contact-export headings and stage labels", () => {
  const result = parseLeadsCsv("Name,Company Name,E-mail 1 - Value,Phone 1 - Value,Lead Status\nAda,Analytical,ada@example.com,08012345678,Closed Won")
  assert.equal(result.leads[0].company, "Analytical")
  assert.equal(result.leads[0].email, "ada@example.com")
  assert.equal(result.leads[0].phone, "08012345678")
  assert.equal(result.leads[0].stage, "won")
})

test("skips missing names, invalid stages, and duplicate emails", () => {
  const csv = "Name,Email,Stage\n,blank@example.com,New\nA,a@example.com,Maybe\nB,existing@example.com,New\nC,c@example.com,New\nD,c@example.com,New"
  const result = parseLeadsCsv(csv, ["EXISTING@example.com"])
  assert.deepEqual(result.leads.map((lead) => lead.name), ["C"])
  assert.deepEqual(result.skipped.map((row) => row.row), [2, 3, 4, 6])
})

test("rejects a file without a name column or with an unfinished quote", () => {
  assert.throws(() => parseLeadsCsv("Email\na@example.com"), /Name or Company/)
  assert.throws(() => parseLeadsCsv('Name,Notes\nA,"unfinished'), /not closed/)
})
