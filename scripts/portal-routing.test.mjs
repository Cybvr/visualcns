import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeReturnTo, legacyCompanyDestination, legacyDashboardDestination, billingTotals, safeExternalUrl } from '../lib/portal-model.ts'

test('old company document selection survives migration', () => {
  assert.equal(legacyCompanyDestination('falcon', '?tab=documents&doc=invoice:inv-1'), '/portal/falcon/documents/invoice/inv-1')
  assert.equal(legacyCompanyDestination('falcon', '?tab=media'), '/portal/falcon/media')
  assert.equal(legacyCompanyDestination('falcon', '?tab=documents'), '/portal/falcon/documents')
})
test('old client dashboard details reach the matching resource', () => {
  assert.equal(legacyDashboardDestination('falcon','/admin/invoices/inv-1/edit'), '/portal/falcon/documents/invoice/inv-1')
  assert.equal(legacyDashboardDestination('falcon','/admin/projects/my-project'), '/portal/falcon/projects/my-project')
  assert.equal(legacyDashboardDestination('falcon','/admin/tasks'), '/portal/falcon/tasks')
  assert.equal(legacyDashboardDestination('falcon','/admin/projects/%ZZ'), '/portal/falcon')
})
test('login accepts local deep links but rejects external destinations and auth loops', () => {
  assert.equal(safeReturnTo('/portal/falcon/documents/invoice/1?tab=billing'), '/portal/falcon/documents/invoice/1?tab=billing')
  for (const value of ['https://evil.example', '//evil.example', '/%2fevil.example', '/\\evil.example', '/%5cevil.example', '/login?next=/portal', '/%6cogin', '/signup', '/%00foo', '/bad%ZZ']) assert.equal(safeReturnTo(value), null, value)
})
test('invoice balances respect partial payments, currencies and void records', () => {
  const totals = billingTotals([{ status:'sent', amount:10000, amountPaid:2500, currency:'USD' }, {status:'paid',amount:5000,currency:'USD'}, {status:'overdue',amount:12000,currency:'NGN'}, {status:'void',amount:99000,currency:'NGN'}, {status:'draft',amount:88000,currency:'NGN'}])
  assert.deepEqual(totals,[{currency:'USD',outstanding:7500,overdue:0,paid:7500},{currency:'NGN',outstanding:12000,overdue:12000,paid:0}])
})
test('external links reject executable URLs', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'),null)
  assert.equal(safeExternalUrl('https://example.com/file'),'https://example.com/file')
})
