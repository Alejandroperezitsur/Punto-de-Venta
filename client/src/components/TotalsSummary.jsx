import React from 'react'
export default function TotalsSummary({ totals, currencyFmt }) {
  return (
    <div className="card" aria-live="polite">
      <div>Subtotal: {currencyFmt.format(totals.subtotal)}</div>
      <div>IVA: {currencyFmt.format(totals.tax)}</div>
      {totals.discount ? <div>Descuento: {currencyFmt.format(totals.discount)}</div> : null}
      <div>TOTAL: {currencyFmt.format(totals.total)}</div>
    </div>
  )
}
