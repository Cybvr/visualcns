/**
 * Reads the first sheet of an Excel .xlsx file in the browser, as rows of text.
 *
 * An .xlsx file is a zip of XML files, so this unzips the few it needs with the
 * browser's own DecompressionStream and reads them with DOMParser. It covers
 * .xlsx only; the older binary .xls format is a different thing entirely.
 */

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number }

function readEntries(view: DataView): ZipEntry[] {
  // The end-of-central-directory record sits in the last 64 KB of the file.
  let end = -1
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 65_557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset
      break
    }
  }
  if (end < 0) throw new Error("This doesn't look like an Excel .xlsx file.")

  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("This Excel file is damaged.")
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLength))
    entries.push({ name, method, compressedSize, localOffset })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function readEntryText(view: DataView, entry: ZipEntry): Promise<string> {
  const nameLength = view.getUint16(entry.localOffset + 26, true)
  const extraLength = view.getUint16(entry.localOffset + 28, true)
  const start = entry.localOffset + 30 + nameLength + extraLength
  const bytes = new Uint8Array(view.buffer, view.byteOffset + start, entry.compressedSize)
  if (entry.method === 0) return new TextDecoder().decode(bytes)
  if (entry.method !== 8) throw new Error("This Excel file uses a format that can't be read here.")
  // slice() copies into a plain ArrayBuffer, which Blob accepts.
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Response(stream).text()
}

function xml(text: string) {
  return new DOMParser().parseFromString(text, "application/xml")
}

/** "C12" to column index 2. */
function columnIndex(reference: string) {
  const letters = reference.replace(/\d+$/, "").toUpperCase()
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

/** Text from a <si> or <is> element, joining any formatted runs. */
function richText(element: Element) {
  return Array.from(element.getElementsByTagName("t")).map((node) => node.textContent ?? "").join("")
}

export async function readXlsxRows(file: File): Promise<string[][]> {
  const view = new DataView(await file.arrayBuffer())
  const entries = readEntries(view)
  const byName = new Map(entries.map((entry) => [entry.name, entry]))
  const read = async (name: string) => {
    const entry = byName.get(name)
    return entry ? readEntryText(view, entry) : null
  }

  // The first sheet in the workbook's own order, found through its relationship id.
  const workbook = await read("xl/workbook.xml")
  const rels = await read("xl/_rels/workbook.xml.rels")
  let sheetPath = "xl/worksheets/sheet1.xml"
  if (workbook && rels) {
    const firstSheet = xml(workbook).getElementsByTagName("sheet")[0]
    const relId = firstSheet?.getAttribute("r:id") ?? firstSheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")
    const target = Array.from(xml(rels).getElementsByTagName("Relationship")).find((rel) => rel.getAttribute("Id") === relId)?.getAttribute("Target")
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`
  }

  const sheet = await read(sheetPath)
  if (!sheet) throw new Error("This Excel file has no sheets.")
  const sharedXml = await read("xl/sharedStrings.xml")
  const shared = sharedXml ? Array.from(xml(sharedXml).getElementsByTagName("si")).map(richText) : []

  const rows: string[][] = []
  for (const row of Array.from(xml(sheet).getElementsByTagName("row"))) {
    // Excel leaves out empty rows; pad them back so row numbers match the sheet.
    const rowNumber = Number(row.getAttribute("r"))
    while (rowNumber > 0 && rows.length < rowNumber - 1) rows.push([])
    const cells: string[] = []
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const reference = cell.getAttribute("r")
      const index = reference ? columnIndex(reference) : cells.length
      const type = cell.getAttribute("t")
      const value = cell.getElementsByTagName("v")[0]?.textContent ?? ""
      let text = value
      if (type === "s") text = shared[Number(value)] ?? ""
      else if (type === "inlineStr") text = richText(cell.getElementsByTagName("is")[0] ?? cell)
      else if (type === "b") text = value === "1" ? "TRUE" : "FALSE"
      while (cells.length < index) cells.push("")
      cells[index] = text
    }
    rows.push(cells)
  }
  return rows
}
