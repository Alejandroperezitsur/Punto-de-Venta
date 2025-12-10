import React, { useEffect, useRef } from 'react'
export default function ProductSearch({ value, onChange }) {
  const inputRef = useRef(null)
  useEffect(() => { try { inputRef.current?.focus() } catch {} }, [])
  return (
    <input ref={inputRef} aria-label="Buscar producto" className="input" placeholder="Buscar" value={value} onChange={e=>onChange(e.target.value)} />
  )
}
