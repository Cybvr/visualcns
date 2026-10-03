import type { LeadFields, LeadStage } from "./leads"

export const MAX_LEADS_PER_IMPORT = 400

export type SkippedLeadRow = { row: number; reason: string }
export type LeadCsvPreview = { leads: LeadFields[]; skipped: SkippedLeadRow[] }

type CsvRow = { cells: string[]; line: number }

function parseCsvRows(input: string): CsvRow[] {
  const source = input.replace(/^\ufeff/, "")
  const rows: CsvRow[] = []
  let cells: string[] = []
  let cell = ""
  let quoted = false
  let line = 1
  let rowLine = 1

  function finishRow() {
    cells.push(cell)
    if (cells.some((value) => value.trim())) rows.push({ cells, line: rowLine })
    cells = []
    cell = ""
    rowLine = line + 1
  }

  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && source[index + 1] === "\n") index++
        cell += "\n"
        line++
      } else {
        cell += char
      }
    } else if (char === '"' && !cell.trim()) {
      quoted = true
    } else if (char === ",") {
      cells.push(cell)
      cell = ""
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && source[index + 1] === "\n") index++
      finishRow()
      line++
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error("A quoted cell in this file is not closed.")
  if (cell || cells.length) finishRow()
  return rows
}

function key(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
}

function column(headers: string[], ...names: string[]) {
  return headers.findIndex((header) => names.includes(header))
}

function field(cells: string[], index: number) {
  return index < 0 ? "" : (cells[index] ?? "").trim()
}

function parseValue(raw: string) {
  if (!raw) return 0
  const cleaned = raw.replace(/[\s,₦$£€]/g, "")
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

const STAGES: Record<string, LeadStage> = {
  new: "new",
  open: "new",
  contacted: "contacted",
  qualified: "qualified",
  proposal: "proposal",
  negotiation: "negotiation",
  won: "won",
  closedwon: "won",
  lost: "lost",
  closedlost: "lost",
}

export function parseLeadsCsv(input: string, existingEmails: Iterable<string> = []): LeadCsvPreview {
  const rows = parseCsvRows(input)
  if (rows.length === 0) throw new Error("This file is empty.")

  const headers = rows[0].cells.map(key)
  const indexes = {
    name: column(headers, "name", "fullname", "leadname", "contactname"),
    first: column(headers, "firstname", "givenname"),
    last: column(headers, "lastname", "surname", "familyname"),
    company: column(headers, "company", "companyname", "business", "organization", "organisation", "organization1name"),
    email: column(headers, "email", "emailaddress", "eaddress", "email1value"),
    phone: column(headers, "phone", "phonenumber", "mobile", "mobilephone", "telephone", "phone1value"),
    source: column(headers, "source", "leadsource"),
    value: column(headers, "value", "dealvalue", "amount", "estimatedvalue"),
    notes: column(headers, "notes", "note", "description"),
    stage: column(headers, "stage", "status", "leadstage", "leadstatus"),
  }
  if (indexes.name < 0 && indexes.first < 0) {
    throw new Error("Add a Name or First Name column to your CSV file.")
  }
  if (rows.length - 1 > MAX_LEADS_PER_IMPORT) {
    throw new Error(`This file has more than ${MAX_LEADS_PER_IMPORT} leads. Split it into smaller files.`)
  }

  const knownEmails = new Set(Array.from(existingEmails, (email) => email.trim().toLowerCase()).filter(Boolean))
  const leads: LeadFields[] = []
  const skipped: SkippedLeadRow[] = []

  for (const row of rows.slice(1)) {
    const name = (field(row.cells, indexes.name) || [field(row.cells, indexes.first), field(row.cells, indexes.last)].filter(Boolean).join(" ")).trim()
    const email = field(row.cells, indexes.email)
    const emailKey = email.toLowerCase()
    const rawValue = field(row.cells, indexes.value)
    const value = parseValue(rawValue)
    const rawStage = field(row.cells, indexes.stage)
    const stage = rawStage ? STAGES[key(rawStage)] : "new"

    if (!name) {
      skipped.push({ row: row.line, reason: "Name is missing" })
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: row.line, reason: "Email address is not valid" })
    } else if (value === null) {
      skipped.push({ row: row.line, reason: "Value is not a valid amount" })
    } else if (!stage) {
      skipped.push({ row: row.line, reason: "Stage is not recognised" })
    } else if (emailKey && knownEmails.has(emailKey)) {
      skipped.push({ row: row.line, reason: "Email is already in leads or repeated in this file" })
    } else {
      leads.push({
        name,
        company: field(row.cells, indexes.company),
        email,
        phone: field(row.cells, indexes.phone),
        source: field(row.cells, indexes.source),
        value,
        notes: field(row.cells, indexes.notes),
        stage,
      })
      if (emailKey) knownEmails.add(emailKey)
    }
  }

  return { leads, skipped }
}
