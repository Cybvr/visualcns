"use client"

import { pdf, Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { estimateStatusMeta, formatDate, formatMoney, type Estimate, type InvoiceParty } from "@/lib/billing"

type EstimatePdfIssuer = InvoiceParty & { logoUrl?: string }

const styles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", color: "#17202a", fontFamily: "Helvetica", fontSize: 10, paddingBottom: 42, paddingHorizontal: 42, paddingTop: 42 },
  header: { alignItems: "flex-start", borderBottomColor: "#d9dee5", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 22 },
  brand: { flexDirection: "row" },
  logo: { height: 30, marginRight: 10, width: 30 },
  issuerName: { fontSize: 13, fontWeight: 700, marginBottom: 5 },
  muted: { color: "#667085", lineHeight: 1.45 },
  label: { color: "#667085", fontSize: 8, marginBottom: 5, textTransform: "uppercase" },
  value: { fontSize: 10, lineHeight: 1.45 },
  documentLabel: { color: "#667085", fontSize: 9, textAlign: "right" },
  documentNumber: { fontSize: 13, fontWeight: 700, marginTop: 4, textAlign: "right" },
  status: { backgroundColor: "#eef1f4", borderRadius: 10, color: "#667085", fontSize: 9, marginTop: 10, paddingHorizontal: 8, paddingVertical: 4, textAlign: "right" },
  metaGrid: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 24 },
  metaColumn: { width: "46%" },
  metaRight: { textAlign: "right" },
  scope: { borderBottomColor: "#d9dee5", borderBottomWidth: 1, paddingBottom: 22 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 10 },
  table: { borderTopColor: "#d9dee5", borderTopWidth: 1, marginTop: 22 },
  tableHeader: { backgroundColor: "#f5f6f8", borderBottomColor: "#d9dee5", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 8, paddingVertical: 8 },
  tableRow: { borderBottomColor: "#e6e9ee", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 8, paddingVertical: 10 },
  description: { flexShrink: 1, paddingRight: 12, width: "55%" },
  billing: { paddingLeft: 8, width: "20%" },
  amount: { fontWeight: 700, paddingLeft: 8, textAlign: "right", width: "25%" },
  bottomGrid: { flexDirection: "row", justifyContent: "space-between", paddingTop: 24 },
  notes: { paddingRight: 24, width: "52%" },
  totals: { width: "42%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalStrong: { borderTopColor: "#d9dee5", borderTopWidth: 1, fontWeight: 700, paddingTop: 9 },
  termsGrid: { borderTopColor: "#d9dee5", borderTopWidth: 1, flexDirection: "row", gap: 24, marginTop: 24, paddingTop: 24 },
  termsColumn: { width: "50%" },
  bullet: { flexDirection: "row", marginBottom: 5 },
  bulletMark: { marginRight: 6 },
})

function plainText(value?: string): string {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function Lines({ value }: { value?: string }) {
  const lines = value?.split("\n").map((line) => line.trim()).filter(Boolean) ?? []
  return <>{lines.map((line, index) => <View key={`${line}-${index}`} style={styles.bullet}><Text style={styles.bulletMark}>•</Text><Text style={styles.muted}>{line}</Text></View>)}</>
}

export function EstimatePdf({ estimate, issuer }: { estimate: Estimate; issuer?: EstimatePdfIssuer }) {
  const meta = estimateStatusMeta[estimate.status] ?? estimateStatusMeta.draft
  const optionalTotal = estimate.lineItems.reduce((sum, item) => sum + (item.optional ? item.amount : 0), 0)
  const profile = issuer ?? { name: "VisualHQ", address: "" }

  return (
    <Document title={`Estimate ${estimate.estimateNumber}`} author={profile.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <PdfImage src={profile.logoUrl || "/visualhqlogo.svg"} style={styles.logo} />
            <View>
              <Text style={styles.issuerName}>{profile.name}</Text>
              {profile.address && <Text style={styles.muted}>{profile.address}</Text>}
              {profile.website && <Text style={styles.muted}>{profile.website}</Text>}
              {profile.phone && <Text style={styles.muted}>{profile.phone}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.documentLabel}>ESTIMATE</Text>
            <Text style={styles.documentNumber}>{estimate.estimateNumber}</Text>
            <Text style={styles.status}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.label}>Prepared for</Text>
            <Text style={styles.value}>{estimate.preparedFor?.name || estimate.client || "-"}</Text>
            {estimate.preparedFor?.email && <Text style={styles.muted}>{estimate.preparedFor.email}</Text>}
            {estimate.preparedFor?.address && <Text style={styles.muted}>{estimate.preparedFor.address}</Text>}
            {estimate.project && <Text style={[styles.muted, { marginTop: 7 }]}>{estimate.project}</Text>}
          </View>
          <View style={styles.metaColumn}>
            <View style={styles.metaRight}><Text style={styles.label}>Issued</Text><Text style={styles.value}>{formatDate(estimate.issuedOn)}</Text></View>
            <View style={[styles.metaRight, { marginTop: 10 }]}><Text style={styles.label}>Valid until</Text><Text style={styles.value}>{formatDate(estimate.validUntil)}</Text></View>
          </View>
        </View>

        <View style={styles.scope}>
          <Text style={styles.title}>{estimate.title || "Estimate"}</Text>
          {estimate.scope && <Text style={styles.muted}>{plainText(estimate.scope)}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={styles.description}>Description</Text>
            <Text style={styles.billing}>Billing</Text>
            <Text style={styles.amount}>Amount ({estimate.currency})</Text>
          </View>
          {estimate.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap>
              <View style={styles.description}>
                <Text>{item.description || "-"}{item.optional ? " (Optional)" : ""}</Text>
                {item.details && <Text style={styles.muted}>{item.details}</Text>}
              </View>
              <Text style={[styles.billing, styles.muted]}>{item.billing || "One-time"}</Text>
              <Text style={styles.amount}>{formatMoney(item.amount, estimate.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.notes}><Text style={styles.muted}>Optional items can be approved separately and will be added only if selected.</Text></View>
          <View style={styles.totals}>
            <View style={[styles.totalRow, styles.totalStrong]}><Text>Base estimate</Text><Text>{formatMoney(estimate.amount, estimate.currency)}</Text></View>
            {optionalTotal > 0 && <View style={styles.totalRow}><Text style={styles.muted}>Optional additions</Text><Text>{formatMoney(optionalTotal, estimate.currency)}</Text></View>}
          </View>
        </View>

        <View style={styles.termsGrid}>
          <View style={styles.termsColumn}><Text style={styles.label}>Terms</Text><Lines value={estimate.terms} /></View>
          <View style={styles.termsColumn}><Text style={styles.label}>Payment details</Text><Lines value={estimate.paymentDetails} /></View>
        </View>
        {estimate.notes && <Text style={[styles.muted, { marginTop: 22 }]}>{estimate.notes}</Text>}
      </Page>
    </Document>
  )
}

export async function downloadEstimatePdf({ estimate, issuer }: { estimate: Estimate; issuer?: EstimatePdfIssuer }): Promise<void> {
  const blob = await pdf(<EstimatePdf estimate={estimate} issuer={issuer} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${estimate.estimateNumber || "estimate"}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
