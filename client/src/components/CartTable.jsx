import React, { useMemo } from 'react'
export default function CartTable({ items, onInc, onDec, onRemove }) {
  const total = useMemo(()=>items.reduce((s,i)=>s+i.unit_price*i.quantity,0),[items])
  return (
    <table className="table">
      <thead>
        <tr><th>Cant</th><th>Producto</th><th>P.Unit</th><th>Importe</th><th></th></tr>
      </thead>
      <tbody>
        {items.map(it => (
          <tr key={it.product_id}>
            <td>{it.quantity}</td>
            <td>{it.name}</td>
            <td>{it.unit_price}</td>
            <td>{(it.unit_price*it.quantity).toFixed(2)}</td>
            <td style={{display:'flex',gap:6}}>
              <button className="btn" aria-label="Incrementar" onClick={()=>onInc(it.product_id)}>+1</button>
              <button className="btn" aria-label="Decrementar" onClick={()=>onDec(it.product_id)}>-1</button>
              <button className="btn btn-ghost" aria-label="Eliminar" onClick={()=>onRemove(it.product_id)}>Quitar</button>
            </td>
          </tr>
        ))}
        {items.length===0 && <tr><td colSpan="5">Sin productos</td></tr>}
      </tbody>
      <tfoot>
        <tr><td colSpan="3">Total</td><td>{total.toFixed(2)}</td><td></td></tr>
      </tfoot>
    </table>
  )
}
