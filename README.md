# POS Pro 2026 — Sistema de Punto de Venta Profesional

> **Desarrollado por Alejandro Pérez Vázquez (APV Labs)**  
> © 2026 APV Labs. Todos los derechos reservados.

Sistema de punto de venta moderno, offline-first y multi-sucursal para retail, supermercados y tiendas de conveniencia. Diseñado con arquitectura enterprise, UI/UX de última generación y soporte PWA/Electron.

**Live demo:** https://alejandroperezitsur.github.io/Punto-de-Venta/

---

## 🚀 Características Principales

### 💳 Pantalla de Ventas (POS)
- **Escaneo rápido** de códigos de barras con motor de escáner dedicado
- **Búsqueda inteligente** de productos por nombre, SKU o código de barras
- **Sintaxis avanzada**: `3*SKU` para agregar 3 unidades de un producto
- **Catálogo visual** con grid responsive de productos (QuickProducts)
- **Pago mixto**: combina efectivo, tarjeta y transferencia en una misma venta
- **Cálculo automático** de cambio con botones de cantidades sugeridas
- **Numpad táctil** integrado para ingreso de montos en efectivo
- **Ticket PDF** con logo personalizable de la empresa
- **Cliente asociado** a la venta (CRM integrado)
- **Descuentos** porcentuales o fijos por ticket
- **Tickets en espera** (hold) para pausar y reanudar ventas
- **Atajos de teclado** profesionales (F2 cobrar, F4 producto manual, F6 cliente, etc.)

### 📦 Inventario
- **Gestión completa** de productos con imágenes, categorías y subcategorías
- **Kardex de movimientos** con historial completo de entradas/salidas
- **Alertas de stock bajo** con indicadores visuales en tiempo real
- **Códigos de barras múltiples** por producto
- **Unidades de medida** configurables (pieza, kg, litro, etc.)
- **Filtros y búsqueda** avanzada en catálogo
- **Sincronización offline** de movimientos de inventario

### 💰 Control de Caja
- **Apertura/cierre de caja** con arqueo de efectivo
- **Depósitos y retiros** de efectivo con comprobante
- **Auditoría completa** de movimientos de caja
- **Conciliación** automática de ventas vs efectivo
- **Estado de caja** en tiempo real en el topbar
- **Corte de caja** por turno o día

### 📊 Dashboard & Reportes
- **KPIs en tiempo real**: ventas totales, ticket promedio, productos más vendidos
- **Gráficos interactivos**: tendencias de ventas, métodos de pago, productos top
- **Exportación CSV** de reportes
- **Filtros por fecha, sucursal y cajero**
- **Vista enterprise** con métricas avanzadas
- **Reportes de auditoría** y trazabilidad completa

### 👥 Gestión de Clientes (CRM)
- **Registro completo** de clientes con teléfono, email y dirección
- **Búsqueda instantánea** por nombre o teléfono
- **Historial de compras** por cliente
- **Asociación de cliente** a ventas en el POS

### 🛡️ Seguridad & Roles
- **Multi-usuario** con roles granulares:
  - **Admin**: acceso total al sistema
  - **Supervisor**: reportes y auditoría
  - **Cajero**: solo ventas y caja
- **Permisos por endpoint** (RBAC)
- **Auditoría completa** de acciones de usuario
- **Autenticación JWT** segura

### 🌐 Offline-First & Sincronización
- **Operación 100% offline** con IndexedDB local
- **Sincronización automática** al recuperar conexión
- **Cola de ventas offline** con idempotencia
- **Detección de conectividad** en tiempo real
- **Indicador de estado** de conexión en topbar

### 📱 PWA & Multiplataforma
- **Instalable** como PWA en cualquier dispositivo
- **Service Worker** con estrategias cache-first
- **Electron desktop app** para Windows, Mac y Linux
- **Responsive design** adaptado a tablets y pantallas táctiles
- **Monorepo** con soporte para GitHub Pages

### 🎨 Personalización & Branding
- **Logo personalizable** del negocio
- **Nombre de negocio** configurable
- **Temas de color** con modo claro/oscuro
- **Glassmorphism UI** con efectos visuales premium
- **Configuración de impresión** de tickets

---

## 🏗️ Arquitectura

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, Zustand, TailwindCSS 4, Recharts |
| **Backend** | Express, SQLite (better-sqlite3), JWT |
| **Desktop** | Electron + electron-builder |
| **Offline** | IndexedDB (idb), Workbox (PWA) |
| **Build** | Vite 5, TypeScript 6 |

### Estructura del Proyecto

```
Punto-de-Venta/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Componentes UI reutilizables
│   │   │   ├── layout/     # Topbar, Sidebar, MainLayout
│   │   │   ├── sales/      # ProductSearch, Cart, PaymentModal, QuickProducts
│   │   │   └── ui/         # Button, Card, Modal, Table, Input, Badge, KpiCard
│   │   ├── views/          # Vistas principales (Sales, Products, Customers, etc.)
│   │   ├── store/          # Estado global (Zustand)
│   │   ├── styles/         # Design system (tokens.css, themes.css, globals.css)
│   │   └── lib/            # Utilidades (api, syncManager, scanner)
│   └── dist/               # Build de producción
├── server/                 # Backend Express
│   ├── routes/             # API endpoints
│   ├── services/           # Lógica de negocio
│   ├── prisma/             # Esquemas de base de datos
│   └── index.ts            # Servidor principal
├── electron/               # Electron desktop wrapper
│   └── main.js             # Proceso principal Electron
├── docs/                   # Documentación técnica
└── tests/                  # Tests unitarios y de integración
```

---

## 🛠️ Desarrollo

### Requisitos
- Node.js 18+
- npm 9+
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Alejandroperezitsur/Punto-de-Venta.git
cd Punto-de-Venta

# Instalar dependencias (root + client + server)
npm run setup

# Iniciar en modo desarrollo
npm start
```

### Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia servidor backend y cliente frontend en desarrollo |
| `npm run build` | Build de producción completa (cliente + servidor) |
| `npm run build:pwa` | Build PWA optimizado para producción |
| `npm run build:desktop` | Compila ejecutables Electron para Windows/Mac/Linux |
| `npm run lint` | Ejecuta ESLint en toda la codebase |
| `npm run lint:fix` | Corrige errores de linting automáticamente |
| `npm run deploy:web` | Build y deploy automático a GitHub Pages |
| `npm run reset-db` | Reinicia la base de datos SQLite |
| `npm run test` | Ejecuta suite de tests |
| `npm run seed` | Puebla la base de datos con datos de prueba |

### Variables de Entorno

Copia `.env.example` a `.env` en la carpeta `server/`:

```env
PORT=3001
JWT_SECRET=tu_secreto_jwt_aqui
NODE_ENV=development
```

---

## 🎯 Casos de Uso Ideales

- **Supermercados y tiendas de conveniencia**: Ventas rápidas con escaneo de códigos de barras
- **Restaurantes y cafeterías**: Pedidos en mesa con facturación mixta
- **Ferias y eventos**: Modo offline para ventas sin conexión
- **Multi-sucursal**: Gestión centralizada con reportes consolidados
- **Retail especializado**: Inventario detallado con Kardex y alertas

---

## ⌨️ Atajos de Teclado (POS)

| Atajo | Acción |
|-------|--------|
| `F2` | Cobrar / Abrir modal de pago |
| `F4` | Agregar producto manual |
| `F6` | Agregar cliente a la venta |
| `F7` | Aplicar descuento |
| `F10` | Abrir configuración |
| `Ctrl + K` | Buscar producto (Command Palette) |
| `?` | Mostrar lista de atajos |
| `ESC` | Cerrar modales |

---

## 🎨 Diseño UI/UX

- **Design System Enterprise 2026**: Tokens CSS, tipografía fluida, spacing 8px grid
- **Glassmorphism**: Efectos de vidrio con backdrop-blur
- **Modo oscuro/claro**: Temas completos con contraste WCAG AA
- **Responsive**: Adaptable a tablets, laptops y pantallas POS kiosko
- **Accesibilidad**: Focus rings, ARIA labels, navegación por teclado
- **Animaciones**: Micro-interacciones con easing profesional
- **Touch-friendly**: Botones con tamaño mínimo 44x44px

---

## 📦 Despliegue

### Docker

```bash
# Desarrollo
docker-compose up

# Producción
docker-compose -f docker-compose.prod.yml up
```

### Electron (Desktop)

```bash
# Build para Windows
npm run build:desktop -- --win

# Build para Mac
npm run build:desktop -- --mac

# Build para Linux
npm run build:desktop -- --linux
```

### Web (GitHub Pages)

```bash
npm run deploy:web
```

---

## 🤝 Contribución

Este es un proyecto privado desarrollado por **APV Labs**.  
Para reportar bugs o solicitar features, contacta a:  
**Alejandro Pérez Vázquez**  
GitHub: [@Alejandroperezitsur](https://github.com/Alejandroperezitsur)

---

## 📄 Licencia

**Propiedad de APV Labs**  
© 2026 Alejandro Pérez Vázquez (APV Labs). Todos los derechos reservados.

Este software no puede ser redistribuido, modificado o utilizado sin autorización expresa del titular.

---

## 📞 Contacto

**APV Labs**  
Desarrollador: Alejandro Pérez Vázquez  
Proyecto: POS Pro 2026  
Repositorio: https://github.com/Alejandroperezitsur/Punto-de-Venta

---

## 🙏 Agradecimientos

- [React](https://react.dev/) — Librería UI
- [Vite](https://vitejs.dev/) — Build tool
- [TailwindCSS](https://tailwindcss.com/) — Framework CSS
- [Electron](https://www.electronjs.org/) — Desktop wrapper
- [Zustand](https://docs.pmnd.rs/zustand) — Estado global
- [Recharts](https://recharts.org/) — Gráficos
- [Lucide](https://lucide.dev/) — Iconos

---

**Hecho con ❤️ por APV Labs**