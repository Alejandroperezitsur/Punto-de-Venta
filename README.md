# POS Pro — Punto de Venta Profesional

Sistema de punto de venta moderno para retail y supermercados con soporte offline, multi-sucursal y roles de usuario.

**Live demo:** https://alejandroperezitsur.github.io/Punto-de-Venta/

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Zustand, TailwindCSS 4, Recharts |
| Backend | Express, SQLite (better-sqlite3), JWT |
| Desktop | Electron + electron-builder |
| Offline | IndexedDB (idb), Workbox (PWA) |
| Build | Vite 5, TypeScript 6 |

## Funcionalidades

- **Ventas** — Escaneo de código de barras, búsqueda rápida, sintaxis `3*SKU`, pago mixto (efectivo/tarjeta/transferencia), ticket PDF con logo
- **Inventario** — Productos con imágenes, categorías/subcategorías, kardex de movimientos, alertas de stock bajo, códigos de barras múltiples
- **Caja** — Apertura/cierre, depósitos/retiros, auditoría de movimientos, conciliación
- **Dashboard** — KPIs (ventas totales, ticket promedio), gráficos de tendencias y métodos de pago, exportación CSV
- **Seguridad** — Multi-usuario con roles (Admin, Supervisor, Cajero), permisos granulares por endpoint, auditoría completa
- **Offline first** — Operación sin conexión con sincronización automática al recuperar conexión
- **PWA** — Instalable, service worker con estrategias cache-first
- **Personalización** — Logo, nombre de negocio, temas de color, branding dinámico
- **Distribución** — Web (GitHub Pages), escritorio (Windows/Mac/Linux via Electron)

## Desarrollo

```bash
git clone <repo>
cd Punto-de-Venta
npm run setup    # instala dependencias (root + client + server)
npm start        # servidor + cliente en dev
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia servidor y cliente en desarrollo |
| `npm run build` | Build de producción (cliente + servidor) |
| `npm run build:pwa` | Build PWA optimizado |
| `npm run build:desktop` | Build ejecutables Electron |
| `npm run lint` | ESLint |
| `npm run deploy:web` | Build + deploy a GitHub Pages (rama gh-pages) |
| `npm run reset-db` | Reinicia la base de datos |

## Credenciales por defecto

```
Usuario:   admin
Contraseña: admin123
```

## Licencia

MIT
