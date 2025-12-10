import React from 'react'
export default function PaymentSection({ payments, onChange, onAddCredit, onAddCash }) {
  const totalPay = payments.reduce((s,p)=>s+(p.amount||0),0)
  return (
    <div className="card">
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span>Pagos</span>
        <button className="btn" onClick={onAddCash}>Completar en efectivo</button>
        <button className="btn" onClick={onAddCredit}>Enviar a crédito</button>
      </div>
      <ul>
        {payments.map((p,i)=>(
          <li key={i}>
            <select value={p.method} onChange={e=>onChange(i,{...p,method:e.target.value})}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="credit">Crédito</option>
            </select>
            <input type="number" aria-label="Monto" value={p.amount||0} onChange={e=>onChange(i,{...p,amount:+e.target.value})} />
          </li>
        ))}
      </ul>
      <div>Total pagos: {totalPay.toFixed(2)}</div>
    </div>
  )
}
