import React, { useRef } from 'react'
export default function SkuInput({ value, onChange, onSubmit }) {
  const ref = useRef(null)
  return (
    <div style={{ display:'flex', gap:6 }}>
      <input ref={ref} aria-label="SKU" className="input" placeholder="SKU" value={value} onChange={e=>onChange(e.target.value)} />
      <button className="btn" onClick={()=>onSubmit(value)}>Agregar</button>
    </div>
  )
}
