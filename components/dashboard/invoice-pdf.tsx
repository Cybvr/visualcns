"use client"

import { pdf, Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { formatDate, formatMoney, invoiceStatusMeta, type Invoice, type InvoiceParty } from "@/lib/billing"

type InvoicePdfIssuer = InvoiceParty & { logoUrl?: string }

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#17202a",
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingBottom: 42,
    paddingHorizontal: 42,
    paddingTop: 42,
  },
  header: {
    alignItems: "flex-start",
    borderBottomColor: "#d9dee5",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 22,
  },
  issuerName: { fontSize: 13, fontWeight: 700, marginBottom: 5 },
  logo: { height: 30, marginRight: 10, width: 30 },
  muted: { color: "#667085", lineHeight: 1.45 },
  invoiceLabel: { color: "#667085", fontSize: 9, textAlign: "right" },
  invoiceNumber: { fontSize: 13, fontWeight: 700, marginTop: 4, textAlign: "right" },
  status: {
    backgroundColor: "#eef1f4",
    borderRadius: 10,
    color: "#667085",
    fontSize: 9,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "right",
  },
  metaGrid: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 24 },
  metaColumn: { width: "46%" },
  label: { color: "#667085", fontSize: 8, marginBottom: 5, textTransform: "uppercase" },
  value: { fontSize: 10, lineHeight: 1.45 },
  metaList: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end" },
  metaItem: { marginBottom: 10, width: "48%" },
  metaItemRight: { textAlign: "right" },
  table: { borderTopColor: "#d9dee5", borderTopWidth: 1 },
  tableHeader: {
    backgroundColor: "#f5f6f8",
    borderBottomColor: "#d9dee5",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tableRow: {
    borderBottomColor: "#e6e9ee",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  description: { flexShrink: 1, paddingRight: 12, width: "52%" },
  quantity: { textAlign: "right", width: "10%" },
  rate: { paddingLeft: 8, textAlign: "right", width: "18%" },
  amount: { fontWeight: 700, paddingLeft: 8, textAlign: "right", width: "20%" },
  bottomGrid: { flexDirection: "row", justifyContent: "space-between", paddingTop: 26 },
  notes: { paddingRight: 24, width: "52%" },
  totals: { width: "42%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalStrong: { borderTopColor: "#d9dee5", borderTopWidth: 1, fontWeight: 700, paddingTop: 9 },
})

export function InvoicePdf({ invoice, issuer }: { invoice: Invoice; issuer?: InvoicePdfIssuer }) {
  const meta = invoiceStatusMeta[invoice.status] ?? invoiceStatusMeta.draft
  const balance = Math.max(0, invoice.amount - (invoice.amountPaid ?? 0))
  const profile = issuer ?? { name: "VisualHQ", address: "" }

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={profile.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row" }}>
            <PdfImage src={profile.logoUrl || "/visualhqlogo.svg"} style={styles.logo} />
            <View>
              <Text style={styles.issuerName}>{profile.name}</Text>
              {profile.address && <Text style={styles.muted}>{profile.address}</Text>}
              {profile.website && <Text style={styles.muted}>{profile.website}</Text>}
              {profile.phone && <Text style={styles.muted}>{profile.phone}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.status}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.value}>{invoice.billTo?.name || invoice.client || "-"}</Text>
            {invoice.billTo?.email && <Text style={styles.muted}>{invoice.billTo.email}</Text>}
            {invoice.billTo?.address && <Text style={styles.muted}>{invoice.billTo.address}</Text>}
            {invoice.project && <Text style={[styles.muted, { marginTop: 7 }]}>Project: {invoice.project}</Text>}
          </View>
          <View style={styles.metaColumn}>
            <View style={styles.metaList}>
              <View style={styles.metaItem}>
                <Text style={[styles.label, styles.metaItemRight]}>Issued</Text>
                <Text style={[styles.value, styles.metaItemRight]}>{formatDate(invoice.issuedOn)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.label, styles.metaItemRight]}>Due</Text>
                <Text style={[styles.value, styles.metaItemRight]}>{formatDate(invoice.dueOn)}</Text>
              </View>
            </View>
            {invoice.poReference && (
              <View>
                <Text style={[styles.label, styles.metaItemRight]}>PO reference</Text>
                <Text style={[styles.value, styles.metaItemRight]}>{invoice.poReference}</Text>
              </View>
            )}
          </View>
        </View>

        {!!invoice.lineItems?.length && (
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.description}>Description</Text>
              <Text style={styles.quantity}>Qty</Text>
              <Text style={styles.rate}>Rate</Text>
              <Text style={styles.amount}>Amount</Text>
            </View>
            {invoice.lineItems.map((item) => (
              <View key={item.id} style={styles.tableRow} wrap>
                <Text style={styles.description}>{item.description || "-"}</Text>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Text style={styles.rate}>{formatMoney(item.unitPrice, invoice.currency)}</Text>
                <Text style={styles.amount}>{formatMoney(Math.round(item.quantity * item.unitPrice), invoice.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomGrid}>
          <View style={styles.notes}>
            {invoice.notes && <><Text style={styles.value}>Note</Text><Text style={styles.muted}>{invoice.notes}</Text></>}
            {invoice.paymentInstructions && <><Text style={[styles.value, { marginTop: 14 }]}>Payment instructions</Text><Text style={styles.muted}>{invoice.paymentInstructions}</Text></>}
          </View>
          <View style={styles.totals}>
            {typeof invoice.subtotal === "number" && <View style={styles.totalRow}><Text style={styles.muted}>Subtotal</Text><Text>{formatMoney(invoice.subtotal, invoice.currency)}</Text></View>}
            {(invoice.discountTotal ?? 0) > 0 && <View style={styles.totalRow}><Text style={styles.muted}>Discount</Text><Text>-{formatMoney(invoice.discountTotal ?? 0, invoice.currency)}</Text></View>}
            {(invoice.taxTotal ?? 0) > 0 && <View style={styles.totalRow}><Text style={styles.muted}>Tax</Text><Text>{formatMoney(invoice.taxTotal ?? 0, invoice.currency)}</Text></View>}
            <View style={[styles.totalRow, styles.totalStrong]}><Text>Total</Text><Text>{formatMoney(invoice.amount, invoice.currency)}</Text></View>
            {(invoice.amountPaid ?? 0) > 0 && <View style={styles.totalRow}><Text style={styles.muted}>Paid</Text><Text>-{formatMoney(invoice.amountPaid ?? 0, invoice.currency)}</Text></View>}
            <View style={[styles.totalRow, styles.totalStrong]}><Text>Balance due</Text><Text>{formatMoney(balance, invoice.currency)}</Text></View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadInvoicePdf({ invoice, issuer }: { invoice: Invoice; issuer?: InvoicePdfIssuer }): Promise<void> {
  const blob = await pdf(<InvoicePdf invoice={invoice} issuer={issuer} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${invoice.invoiceNumber || "invoice"}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
