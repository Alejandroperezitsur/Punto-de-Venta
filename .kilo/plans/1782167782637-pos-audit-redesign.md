# Plan: Rediseño Completo del POS — Auditoría y Rediseño 2026

## Auditoría Profunda del Estado Actual

### 1. Arquitectura de Diseño (tokens.css + themes.css)
- ✅ Sistema de tokens HSL con 6 niveles de profundidad, gradientes temáticos, glassmorphism
- ✅ Fluid type scale, 8px grid spacing system
- ⚠️ Touch target mínimo es `2.75rem` (44px) pero algunos botones usan `h-[4.5rem]` que es excesivo
- ❌ Opacidades extremadamente bajas: `/15`, `/20` hacen texto invisible en ambos temas

### 2. Layout (MainLayout + Sidebar + Topbar)
- ✅ Sidebar colapsable con navegación por permisos, active indicator, atajos de teclado
- ✅ Topbar con breadcrumb, reloj, estado de caja, toggle dark
- ✅ Mobile overlay con backdrop-blur, safe-area-inset support
- ⚠️ Header height fija `3rem` puede verse pequeño en móviles
- ⚠️ No hay menú contextual en móvil para acciones rápidas del POS

### 3. Punto de Venta (Sales/index.tsx)
- ✅ Panel izquierdo (60%): búsqueda + grid de productos
- ✅ Panel derecho (40%): carrito + totales + checkout
- ⚠️ `gap-3 lg:gap-4` fijo - no hay breakpoint intermedio
- ❌ `min-width: 320px` fuerza scroll horizontal en móviles
- ❌ `maxWidth: 420px` en carrito hace que se comprima en tablets
- ⚠️ Cash gate usa `window.location.hash = '#/caja'` en vez de `useNavigate()`

### 4. Componentes UI
- ✅ Button: 12 variantes, 10 tamaños
- ✅ Input: iconos, scanner mode, password toggle
- ⚠️ Modal backdrop usa `bg-black/50` pero en dark mode el override `bg-black/0.65` no es suficiente
- ⚠️ Toast usa `z-[var(--z-toast)]` pero el toast-container no está definido en tokens

### 5. Problemas Críticos Identificados

| Tema | Problema | Severidad | Ubicación |
|------|----------|-----------|-----------|
| **Contraste** | Textos con opacity `/15`, `/20`, `/25` invisibles — fallan WCAG AA | 🔴 Alta | `globals.css:129`, `themes.css:111-112` |
| **Dark Mode** | Selectores `[data-mode="dark"]` vs `[data-theme="dark"]` inconsistens | 🔴 Alta | `globals.css:823-872` |
| **Responsive** | No hay layout para tablet (1024-1279px), carrito se rompe | 🔴 Alta | `Sales/index.tsx:532-535` |
| **Móvil** | Layout asume desktop, no hay vista móvil optimizada | 🔴 Alta | `globals.css:894-929` |
| **Blur** | `backdrop-blur-sm`, `md`, `lg`, `xl` usados simultáneamente | 🟡 Media | Múltiples archivos |
| **Animaciones** | `success-pulse`, `animate-border-glow` distrae del flujo | 🟡 Media | `globals.css:246-286` |
| **Iconos sobrepuestos** | Botones del carrito header con `size-9` pueden tapar texto | 🟡 Media | `Sales/index.tsx:548-596` |
| **Textos pequeños** | `text-[10px]`, `text-[11px]` usado excesivamente | 🟡 Media | Múltiples archivos |
| **Espaciado inconsistente** | Mezcla `px-3 py-2.5`, `px-4 py-3`, `p-4` sin sistema | 🟡 Media | `Sales/index.tsx` |
| **Autoguardado** | Settings no tiene autoguardado, solo botón manual | 🟡 Media | `BusinessSettings.jsx:58-73` |

### 6. Hallazgos Específicos

**Iconos tapando elementos:**
- `size-9` botones en carrito header (`Sales/index.tsx:557, 566, 576, 584, 594`) están muy cerca
- Posición absoluta del botón edit en productos (`Products.jsx:27`) puede tapar contenido

**Textos repetidos:**
- "Ventas" título principal vs "Ventas" en breadcrumb vs "Ventas" en nav — confuso
- Botón "COBRAR" en mayúsculas puede ser agresivo visualmente

**Textos muy pequeños:**
- `text-[10px]` para badges, labels, precios secundarios — difícil de leer en POS
- `text-[11px]` para descripciones, links, hints

**Blur excesivo:**
- `backdrop-blur-sm` en modales (4px) + `backdrop-blur-md` en overlays (8px) + `backdrop-blur-lg` (16px) en glass panels
- En dispositivos de gama baja causa jank

**Dark mode contrastes:**
- `--muted-foreground-l: 72%` en dark es muy claro (debería ser ~55%)
- `--border-l: 22%` es muy claro, debería ser ~15% para mejor contraste

---

## Plan de Rediseño 2026 — Walmart Grade

### Fase 1: Contraste y Legibilidad (Prioridad Crítica)

**Objetivo:** WCAG AA compliance + legibilidad premium

1. **Contraste mínimo 4.5:1** para texto principal:
   - `text-muted-foreground/45` → `text-muted-foreground/65`
   - `text-muted-foreground/40` → `text-muted-foreground/60`
   - `text-muted-foreground/35` → `text-muted-foreground/55`

2. **Tamaño de texto legible en POS:**
   - Precio de productos: `text-base` (16px) mínimo en grid
   - Total del carrito: `text-4xl` consistente
   - Labels: `text-sm` no `text-xs`

3. **Dark mode refinado:**
   - `--muted-foreground-l: 60%` (no 72%)
   - `--border-l: 16%` (no 22%)
   - Unificar selectores: solo `[data-theme="dark"]`

### Fase 2: Layout Responsivo Enterprise

**Objetivo:** Funcionamiento perfecto 1920px → 375px

4. **Mobile-first POS layout:**
```css
/* Desktop (≥1280px) */
.pos-layout { flex-direction: row; }
.pos-cart-panel { flex-basis: 40%; max-width: 420px; }

/* Tablet (768-1279px) */
@media (max-width: 1279px) {
  .pos-cart-panel { flex-basis: 45%; min-width: 280px; }
  .pos-catalog-panel { flex-basis: 55%; }
}

/* Mobile (<768px) */
@media (max-width: 767px) {
  .pos-layout { 
    flex-direction: column; 
    height: calc(100vh - var(--header-height));
  }
  .pos-cart-panel { 
    position: fixed; 
    bottom: 0; 
    left: 0; 
    right: 0;
    max-height: 40vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
}
```

5. **Bottom sheet para carrito en móvil:**
   - Sheet que se desliza desde abajo
   - Handle indicator visual
   - Collapse/expand con gestos touch

6. **Product grid adaptativo:**
   - Desktop: `minmax(160px, 1fr)` — 3 columnas mínimo
   - Tablet: `minmax(140px, 1fr)` — 2 columnas más espacio
   - Móvil: `minmax(120px, 1fr)` — 2 columnas compactas

### Fase 3: Componentes Premium

**Objetivo:** Experiencia Walmart-level polish

7. **Card Product Redesign:**
   - Imagen más grande (`size-16` no `4.5rem`)
   - Precio con jeroglífico más claro
   - Stock indicator como barra superior, no bottom
   - Eliminar status dot superpuesto (línea 64-65 QuickProducts.tsx)

8. **Cart Redesign:**
   - Items con más padding vertical (`py-4` no `py-3`)
   - Quantity stepper más ancho (`w-12` no `w-12`)
   - Line total con acento verde cuando es reciente
   - Empty state con ilustración + CTA "Escanea un producto"

9. **Payment Modal Premium:**
   - Header con total más grande y prominente
   - Métodos de pago con iconos más grandes
   - Numpad con haptic feedback suave
   - Quick amounts como pills horizontales scrolleables
   - Confirm button con progress bar animado

10. **Settings Auto-save:**
    - Guardado automático con debounce 2s
    - Indicador "Guardando..." / "Guardado ✓"
    - Solo guardar cambios significativos (profundidad 1 nivel)

### Fase 4: Micro-interacciones 2026

**Objetivo:** Feedback táctil premium

11. **Haptic feedback:**
    - Producto agregado: `navigator.vibrate([15])` ✓
    - Error de scan: `navigator.vibrate([30, 50, 30])` patrón error
    - Pago exitoso: `navigator.vibrate([50])`
    - Botón presionado: `navigator.vibrate([5])` sutil

12. **Animaciones funcionales (no decorativas):**
    - Eliminar: `animate-border-glow`, `success-pulse` infinito
    - Mantener: `cart-item-enter`, `scale-in` en modales
    - Agregar: `number-tick` cuando cambian totales

13. **Reduced motion compliance:**
    - Verificar que `prefers-reduced-motion: reduce` detenga todas las animaciones

### Fase 5: Performance

**Objetivo:** 60fps en dispositivos de gama baja

14. **Blur optimization:**
    - Un solo nivel de blur por pantalla: overlays o modales
    - Eliminar blur de `.metric-card::before` hover effect
    - Usar `transform: translateZ(0)` para aceleración GPU

15. **Virtualización:**
    - Cart ya usa `@tanstack/react-virtual` ✓
    - QuickProducts debería usar virtualización en listas largas

16. **Bundle optimization:**
    - Code splitting por rutas
    - Lazy load de modales pesados

---

## Archivos a Modificar

| Archivo | Prioridad | Cambios |
|---------|-----------|---------|
| `client/src/styles/tokens.css` | 🔴 Alta | Contraste minimo 65/1, touch targets 44px |
| `client/src/styles/themes.css` | 🔴 Alta | Dark mode muted/border contrastes |
| `client/src/styles/globals.css` | 🔴 Alta | Unificar dark mode, reducir blur |
| `client/src/views/Sales/index.tsx` | 🔴 Alta | Mobile layout, autoguardado settings |
| `client/src/components/sales/Cart.tsx` | 🔴 Alta | Empty state, contraste |
| `client/src/components/sales/QuickProducts.tsx` | 🔴 Alta | Grid responsive, eliminar dots superpuestos |
| `client/src/components/sales/PaymentModal.tsx` | 🟡 Media | Haptic, tamaño responsive |
| `client/src/views/BusinessSettings.jsx` | 🟡 Media | Auto-save con debounce |
| `client/src/views/Products.jsx` | 🟡 Media | Card redesign |
| `client/src/components/layout/Topbar.jsx` | 🟡 Media | Mobile controls |

---

## Validación

- [ ] WCAG AA contrast test en textos secundarios
- [ ] POS layout funcional en 1920px → 375px
- [ ] Dark mode toggle sin parpadeos
- [ ] Venta completa end-to-end sin errores
- [ ] Cash gate overlay correcto
- [ ] Sidebar collapse/expand suave
- [ ] Keyboard shortcuts (F1-F10)
- [ ] Performance en móvil (Chrome dev tools)

---

## Pregunta para el Usuario

¿Qué prioridad tienes para el rediseño?
1. **Contraste y accesibilidad** (texto legible, WCAG compliance)
2. **Mobile-first** (vista móvil optimizada)
3. **Dark mode polish** (contraste mejorado)
4. **Todo incluido** (implementar completo)

¿Quieres que priorice alguna fase o prefieres el orden propuesto?