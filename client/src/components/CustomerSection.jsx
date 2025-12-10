import React from 'react'
export default function CustomerSection({ customers, customerId, onSelect }) {
  return (
    <div className="card">
      <label>ID Cliente</label>
      <select aria-label="Cliente" value={customerId} onChange={e=>onSelect(e.target.value)}>
        <option value="">Sin cliente</option>
        {customers.map(c=> <option key={c.id} value={String(c.id)}>{c.name}</option>)}
      </select>
    </div>
  )
}
