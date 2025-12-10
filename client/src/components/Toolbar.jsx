import React, { useEffect, useRef, useState } from 'react'

function IconVentas() { return (<svg className="icon" viewBox="0 0 24 24"><path d="M3 6h18v2H3zm2 5h14v2H5zm3 5h8v2H8z"/></svg>) }
function IconProductos() { return (<svg className="icon" viewBox="0 0 24 24"><path d="M4 4h9v7H4zm7 9h9v7h-9zM15 4h5v5h-5zM4 13h5v7H4z"/></svg>) }
function IconClientes() { return (<svg className="icon" viewBox="0 0 24 24"><path d="M12 6a4 4 0 110 8 4 4 0 010-8zm-8 12a8 8 0 0116 0H4z"/></svg>) }
function IconConfig() { return (<svg className="icon" viewBox="0 0 24 24"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2.2.4a7 7 0 00-.7 1.7l1.3 1.9-2 2-1.9-1.3a7 7 0 00-1.7.7L16 21h-4l-.4-2.2a7 7 0 00-1.7-.7l-1.9 1.3-2-2 1.3-1.9a7 7 0 00-.7-1.7L3 12l2.2-.4a7 7 0 00.7-1.7L4.6 8l2-2 1.9 1.3c.6-.3 1.1-.5 1.7-.7L12 3h4l.4 2.2c.6.2 1.2.4 1.7.7L20 4.6l2 2-1.3 1.9c.3.6.5 1.1.7 1.7L21 12z"/></svg>) }
function IconReportes() { return (<svg className="icon" viewBox="0 0 24 24"><path d="M4 4h16v2H4zM6 8h12v2H6zM8 12h8v2H8zM10 16h4v2h-4z"/></svg>) }

export default function Toolbar({ tab, setTab, onToggleTheme, dark, brandName, logoSrc, cashOpen, cashEstimate, onRefreshCash, themeProfiles, themeProfileSel, onApplyThemeProfile, onDuplicateThemeProfile, onRenameThemeProfile, onDeleteThemeProfile }) {
  const tabs = [ ['ventas','Ventas'], ['productos','Productos'], ['clientes','Clientes'], ['reportes','Reportes'], ['config','Configuración'] ]
  const [lastMenuOpen, setLastMenuOpen] = useState(false)
  const [lastRenameVal, setLastRenameVal] = useState('')
  const lastMenuRef = useRef(null)
  const [lastMenuAnim, setLastMenuAnim] = useState(false)
  const [lastPulse, setLastPulse] = useState(false)
  const [shadow, setShadow] = useState(false)
  const [motto, setMotto] = useState('')
  useEffect(() => {
    if (!lastMenuOpen) return
    const onDown = (e) => { try { if (lastMenuRef.current && !lastMenuRef.current.contains(e.target)) setLastMenuOpen(false) } catch {} }
    const onKey = (e) => { try { if (e.key === 'Escape') setLastMenuOpen(false) } catch {} }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [lastMenuOpen])
  useEffect(() => { if (lastMenuOpen) { const t = setTimeout(() => setLastMenuAnim(true), 0); return () => { clearTimeout(t); setLastMenuAnim(false) } } else { setLastMenuAnim(false) } }, [lastMenuOpen])
  useEffect(() => {
    const onScroll = () => { setShadow(window.scrollY > 2) }
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    try { setMotto(localStorage.getItem('business_motto') || '') } catch {}
  }, [])
  return (
    <div className={`toolbar ${shadow ? 'shadow' : ''}`}>
      <div className="brand" title={motto || undefined}>{logoSrc ? <img className="logo" src={logoSrc} alt="logo" /> : <svg className="logo" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm2 4h12v2H6zm3 4h6v2H9z"/></svg>}{brandName || 'Punto de Venta'}</div>
      <div className="spacer" />
      {tabs.map(([key, label]) => (
        <button key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} title={label}>
          {key === 'ventas' && <IconVentas />}
          {key === 'productos' && <IconProductos />}
          {key === 'clientes' && <IconClientes />}
          {key === 'config' && <IconConfig />}
          {key === 'reportes' && <IconReportes />}
          <span style={{ marginLeft: 6 }}>{label}</span>
        </button>
      ))}
      <div className="actions">
        {(() => { const names = Object.keys(themeProfiles || {}); if (names.length === 0) return null; const last = localStorage.getItem('last-theme-profile') || ''; return (
          <div style={{ display: 'contents' }}>
            <select value={themeProfileSel} onChange={e => onApplyThemeProfile(e.target.value)} title="Cambiar tema rápido" style={{ maxWidth: 160 }}>
              <option value="">Tema rápido</option>
              {names.map(n => (<option key={n} value={n}>{n}</option>))}
            </select>
            {last && names.includes(last) && (() => { const prof = (themeProfiles || {})[last] || {}; const hex = (h) => { const m = String(h).replace('#',''); const r = parseInt(m.slice(0,2),16)||0; const g = parseInt(m.slice(2,4),16)||0; const b = parseInt(m.slice(4,6),16)||0; return { r, g, b } }; const c = hex(prof.theme_primary || ''); const fg = (() => { if (!prof.theme_primary) return '#fff'; const y = (c.r*299 + c.g*587 + c.b*114)/1000; return y > 150 ? '#111' : '#fff' })(); const bg = prof.theme_primary || 'var(--primary)'; const acc = prof.theme_accent || ''; return (
              <div style={{ position: 'relative', display: 'inline-block' }} ref={lastMenuRef}>
                <button className="btn" style={{ padding: '6px 10px', background: bg, color: fg, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, transition: 'transform 180ms ease, box-shadow 180ms ease', transform: lastPulse ? 'scale(1.03)' : 'none', boxShadow: lastPulse ? '0 0 0 6px rgba(2, 6, 23, 0.06)' : 'none' }} onClick={() => { if (lastMenuOpen) { setLastMenuOpen(false) } else { setLastRenameVal(last); setLastMenuOpen(true) } }} title={`Acciones del último tema: ${last}`}>
                  <span style={{ width: 12, height: 12, background: acc || '#e53935', borderRadius: 3, border: '1px solid var(--border)' }} />
                  Último: {last}
                </button>
                {lastMenuOpen && (
                  <div className="card" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 300, padding: 8, minWidth: 220, opacity: lastMenuAnim ? 1 : 0, transform: lastMenuAnim ? 'scale(1)' : 'scale(0.98) translateY(-4px)', transition: 'opacity 140ms ease, transform 140ms ease' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <button className="btn" onClick={() => { onApplyThemeProfile(last); setLastPulse(true); setTimeout(() => setLastPulse(false), 220); setLastMenuOpen(false) }} title="Aplicar">Aplicar</button>
                      <button className="btn btn-ghost" onClick={() => { onDuplicateThemeProfile(last); setLastMenuOpen(false) }} title="Duplicar">Duplicar</button>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input value={lastRenameVal} onChange={e => setLastRenameVal(e.target.value)} style={{ flex: 1 }} title="Nuevo nombre" />
                        <button className="btn btn-ghost" onClick={() => { const nn = (lastRenameVal || '').trim(); if (!nn) return; onRenameThemeProfile(last, nn); setLastMenuOpen(false) }} title="Renombrar">Renombrar</button>
                      </div>
                      <button className="btn btn-ghost" onClick={() => { onDeleteThemeProfile(last); setLastMenuOpen(false) }} title="Eliminar">Eliminar</button>
                      <button className="btn btn-ghost" onClick={() => setLastMenuOpen(false)} title="Cerrar">Cerrar</button>
                    </div>
                  </div>
                )}
              </div>
            ) })()}
          </div>
        ) })()}
        <span style={{ marginRight: 8, padding: '4px 8px', borderRadius: 8, background: cashOpen ? 'var(--accent, #e53935)' : '#eee', color: cashOpen ? '#fff' : '#333' }} title="Estado de caja y saldo estimado">{cashOpen ? `Caja abierta${typeof cashEstimate === 'number' ? ` · ${cashEstimate.toLocaleString(undefined, { style: 'currency', currency: 'MXN' })}` : ''}` : 'Caja cerrada'}</span>
        <button className="btn" onClick={onRefreshCash} title="Actualizar estado de caja">Refrescar caja</button>
        <button className="btn" onClick={onToggleTheme} title="Alternar tema claro/oscuro">{dark ? 'Claro' : 'Oscuro'}</button>
      </div>
    </div>
  )
}
