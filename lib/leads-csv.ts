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
  return parseLeadRows(parseCsvRows(input), existingEmails)
}

/**
 * Leads from the first Markdown table in the text: a header row, the
 * |---|---| line under it, then one lead per row.
 */
export function parseLeadsMarkdown(input: string, existingEmails: Iterable<string> = []): LeadCsvPreview {
  const rows: CsvRow[] = []
  const lines = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n")
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim()
    if (!line.startsWith("|")) {
      // The table ended; stop at the first one.
      if (rows.length) break
      continue
    }
    // The |---|:---:| line under the header.
    if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line)) continue
    const cells = line.replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim())
    rows.push({ cells, line: index + 1 })
  }
  // No table: a .md file holding plain CSV text, which happens with exports.
  if (rows.length === 0) return parseLeadsCsv(input, existingEmails)
  return parseLeadRows(rows, existingEmails)
}

/** Leads from a spreadsheet's rows, e.g. an Excel sheet, the first row being the headers. */
export function parseLeadsSheet(sheet: string[][], existingEmails: Iterable<string> = []): LeadCsvPreview {
  const rows = sheet
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter((row) => row.cells.some((value) => value.trim()))
  return parseLeadRows(rows, existingEmails)
}

/** Shared by every format: headers in the first row, then checks each lead. */
function parseLeadRows(rows: CsvRow[], existingEmails: Iterable<string>): LeadCsvPreview {
  if (rows.length === 0) throw new Error("This file is empty.")

  const headers = rows[0].cells.map(key)
  const indexes = {
    name: column(headers, "name", "fullname", "leadname", "contactname"),
    first: column(headers, "firstname", "givenname"),
    last: column(headers, "lastname", "surname", "familyname"),
    company: column(headers, "company", "companyname", "business", "organization", "organisation", "organization1name"),
    email: column(headers, "email", "emailaddress", "eaddress", "email1value"),
    phone: column(headers, "phone", "phonenumber", "mobile", "mobilephone", "telephone", "phone1value"),
    address: column(headers, "address", "fulladdress", "streetaddress", "location"),
    category: column(headers, "category", "categories", "type", "businesstype", "industry"),
    // Google Maps style exports split reviews into a rating and a count.
    rating: column(headers, "rating", "stars", "averagerating"),
    reviews: column(headers, "reviews", "review", "reviewcount", "reviewscount", "totalreviews", "numberofreviews"),
    source: column(headers, "source", "leadsource"),
    value: column(headers, "value", "dealvalue", "amount", "estimatedvalue"),
    notes: column(headers, "notes", "note", "description"),
    stage: column(headers, "stage", "status", "leadstage", "leadstatus"),
  }
  // Business lists often have only a company, which then names the lead.
  if (indexes.name < 0 && indexes.first < 0 && indexes.company < 0) {
    throw new Error("Add a Name or Company column to your file.")
  }
  if (rows.length - 1 > MAX_LEADS_PER_IMPORT) {
    throw new Error(`This file has more than ${MAX_LEADS_PER_IMPORT} leads. Split it into smaller files.`)
  }

  const knownEmails = new Set(Array.from(existingEmails, (email) => email.trim().toLowerCase()).filter(Boolean))
  const leads: LeadFields[] = []
  const skipped: SkippedLeadRow[] = []

  for (const row of rows.slice(1)) {
    const name = (field(row.cells, indexes.name) || [field(row.cells, indexes.first), field(row.cells, indexes.last)].filter(Boolean).join(" ") || field(row.cells, indexes.company)).trim()
    const rating = field(row.cells, indexes.rating)
    const reviewCount = field(row.cells, indexes.reviews)
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
        address: field(row.cells, indexes.address),
        category: field(row.cells, indexes.category),
        // "4.9 (37)" from a rating and a count, or whichever one the file has.
        reviews: rating && reviewCount ? `${rating} (${reviewCount})` : rating || reviewCount,
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
