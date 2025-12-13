# POS Pro - Sistema Profesional de Punto de Venta

Sistema de punto de venta moderno, rápido y profesional para retail y supermercados.

## 🚀 Características

### Ventas
- ✅ Escaneo rápido de productos (código de barras y búsqueda)
- ✅ Sintaxis rápida: `3*SKU` para agregar cantidades
- ✅ Pagos mixtos (efectivo, tarjeta, transferencia)
- ✅ Tickets profesionales con logo

### Inventario
- ✅ Gestión de productos con imágenes
- ✅ Categorías y subcategorías
- ✅ Kardex (historial de movimientos de stock)
- ✅ Alertas de stock bajo

### Caja
- ✅ Apertura y cierre de caja
- ✅ Depósitos y retiros
- ✅ Auditoría de movimientos

### Reportes
- ✅ Dashboard con gráficos (tendencias, métodos de pago)
- ✅ KPIs: ventas totales, ticket promedio
- ✅ Exportación CSV/Excel

### Seguridad
- ✅ Multi-usuario con roles (Admin, Supervisor, Cajero)
- ✅ Permisos granulares por endpoint
- ✅ Auditoría completa de acciones

### Distribución
- ✅ PWA instalable
- ✅ Electron para escritorio (Windows, Mac, Linux)

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/your-repo/pos-pro.git
cd pos-pro

# Instalar dependencias
npm run setup

# Iniciar en desarrollo
npm start
```

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia servidor y cliente en desarrollo |
| `npm run build:pwa` | Genera build PWA optimizado |
| `npm run build:desktop` | Genera ejecutables Electron |
| `npm run reset-db` | Reinicia la base de datos |
| `npm run setup` | Instala todas las dependencias |

## 🛠 Tecnologías

- **Frontend**: React 18, Zustand, TailwindCSS, Recharts
- **Backend**: Express, SQLite (better-sqlite3), JWT
- **Desktop**: Electron
- **PWA**: Vite PWA Plugin, Workbox

## 👥 Roles y Permisos

| Permiso | Admin | Supervisor | Cajero |
|---------|:-----:|:----------:|:------:|
| Ventas | ✅ | ✅ | ✅ |
| Inventario | ✅ | ✅ | 👁️ |
| Reportes | ✅ | ✅ | ❌ |
| Caja | ✅ | ✅ | ✅ |
| Usuarios | ✅ | ❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ |

## 📝 Credenciales por defecto

```
Usuario: admin
Contraseña: admin123
```

## 📄 Licencia

MIT License - Uso libre para proyectos comerciales y personales.
