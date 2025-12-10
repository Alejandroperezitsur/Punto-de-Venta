import React, { useEffect, useState } from 'react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

function readLS(k, d='') { try { return localStorage.getItem(k) || d } catch { return d } }
function writeLS(k, v) { try { localStorage.setItem(k, v) } catch {} }

export default function BusinessSettings() {
  const [name, setName] = useState(readLS('brand_name','Punto de Venta'))
  const [slogan, setSlogan] = useState(readLS('brand_slogan',''))
  const [theme, setTheme] = useState(readLS('theme','light'))
  const [primary, setPrimary] = useState(readLS('brand_color','#1e88e5'))
  const [logo, setLogo] = useState(readLS('brand_logo',''))
  const [bgImage, setBgImage] = useState(readLS('bg_image',''))

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  useEffect(() => { document.documentElement.style.setProperty('--primary', primary) }, [primary])

  const onUploadLogo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setLogo(String(r.result||''))
    r.readAsDataURL(f)
  }
  const onUploadBg = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setBgImage(String(r.result||''))
    r.readAsDataURL(f)
  }
  const save = () => {
    writeLS('brand_name', name)
    writeLS('brand_slogan', slogan)
    writeLS('theme', theme)
    writeLS('brand_color', primary)
    writeLS('brand_logo', logo)
    writeLS('bg_image', bgImage)
    try { window.dispatchEvent(new CustomEvent('app-message', { detail: 'Ajustes guardados' })) } catch {}
  }
  return (
    <div className="container">
      <h2>Ajustes del Negocio</h2>
      <Card style={{ marginTop: 8 }}>
        <div className="grid-2" style={{ gap: 12 }}>
          <Input label="Nombre comercial" value={name} onChange={e=>setName(e.target.value)} />
          <Input label="Lema" value={slogan} onChange={e=>setSlogan(e.target.value)} />
          <div className="field"><span className="label">Tema</span><select className="input" value={theme} onChange={e=>setTheme(e.target.value)}><option value="light">Light</option><option value="dark">Dark</option><option value="business">Business</option><option value="soft">Soft</option></select></div>
          <Input label="Color principal" type="color" value={primary} onChange={e=>setPrimary(e.target.value)} />
          <div className="field"><span className="label">Logo</span><input className="input" type="file" accept="image/*" onChange={onUploadLogo} /></div>
          <div className="field"><span className="label">Fondo personalizado</span><input className="input" type="file" accept="image/*" onChange={onUploadBg} /></div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="primary" onClick={save}>Guardar</Button>
        </div>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <h3>Vista previa</h3>
        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          {logo ? <img src={logo} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : <div className="badge" style={{ background: 'var(--primary)', color: '#fff' }}>Logo</div>}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{name}</div>
            <div className="muted" style={{ marginTop: 2 }}>{slogan}</div>
          </div>
        </div>
        {bgImage && <div style={{ marginTop: 12, height: 140, borderRadius: 10, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
      </Card>
    </div>
  )
}
