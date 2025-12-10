import React, { useEffect, useRef } from 'react'
export default function Modal({ open, title, children, onClose, ariaLabel }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    try { ref.current?.focus() } catch {}
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={ariaLabel || title || 'Modal'}>
      <div className="card modal" tabIndex="-1" ref={ref}>
        {title && <h3>{title}</h3>}
        <div>{children}</div>
        {onClose && <div className="modal-actions"><button className="btn" onClick={onClose} aria-label="Cerrar modal">Cerrar</button></div>}
      </div>
    </div>
  )
}
