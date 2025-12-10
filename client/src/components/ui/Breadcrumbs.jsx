import React from 'react'
export default function Breadcrumbs({ items=[] }) {
  return (
    <div className="row breadcrumbs" style={{ gap: 6, marginBottom: 8 }}>
      {items.map((it,i)=> (
        <span key={i} className="muted">{it}{i<items.length-1?' / ':''}</span>
      ))}
    </div>
  )
}
