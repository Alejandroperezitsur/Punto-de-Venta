# Plan: Rediseño Completo del POS — Auditoría y Rediseño 2026

## Auditoría Profunda del Estado Actual

### 1. Arquitectura de Diseño (tokens.css + themes.css) — SÓLIDO
- Sistema de tokens HSL con 6 niveles de profundidad, gradientes temáticos, glassmorphism
- Fluid type scale, 8px grid, 4 niveles de densidad
- Dark mode completo con overrides de sombras, opacidades y superficies
- 3 temas: light, dark, corporate

### 2. Layout (MainLayout + Sidebar + Topbar) — SÓLIDO
- Sidebar colapsable con navegación por permisos, active indicator, atajos de teclado
- Topbar con breadcrumb, reloj, estado de caja, toggle dark, notificaciones
- Mobile overlay con backdrop-blur, safe-area-inset support
- Animaciones de página (page-enter)

### 3. Punto de Venta (Sales/index.tsx) — SÓLIDO PERO MEJORABLE
- Panel izquierdo (60%): búsqueda + grid de productos
- Panel derecho (40%): carrito + totales + checkout
- Modal de pago con numpad, montos rápidos, múltiples métodos
- Tickets en espera, descuentos, búsqueda de cliente
- Keyboard shortcuts completos (F2-F6, etc.)
- Cash gate (caja cerrada)

### 4. Componentes UI — SÓLIDO
- Button: 12 variantes, 10 tamaños, loading state
- Input: iconos, scanner mode, floating label, password toggle
- Modal: 6 tamaños, 4 variantes (default, fullscreen, sheet, drawer), animado
- Toast: 4 variantes, progress bar, actions
- Cart: virtualización, low-stock indicator, animaciones de entrada
- QuickProducts: búsqueda, categorías, sort, paginación

### 5. Problemas Detectados (Oportunidades de Mejora)

| Área | Problema | Severidad |
|------|----------|-----------|
| **Contraste** | `text-muted-foreground/45`, `/40`, `/35` — textos auxiliares extremadamente tenues, fallan WCAG AA en ambas temas | Alta |
| **Dark mode** | Múltiples selectores `[data-mode="dark"]` y `[data-theme="dark"]` duplicados, inconsistentes | Media |
| **Responsive** | POS layout usa `flex gap-3` fijo, no hay breakpoint para tablet (768px-1024px), carrito se comprime | Alta |
| **Móvil** | No hay vista móvil dedicada; el POS asume desktop. Touch targets OK pero layout no se adapta | Alta |
| **Animaciones** | `animate-border-glow`, `success-pulse`, `pulse-glow` — exceso de animaciones simultáneas que distraen | Media |
| **Blur** | `backdrop-blur-md` en modales + `backdrop-blur-sm` en overlays + glass panels — apilamiento de blur costoso en dispositivos bajos | Media |
| **Botones** | Checkout usa `min-h-[4rem]` que puede verse gigante en móvil; PaymentModal `min-h-[5.5rem]` | Baja |
| **Espaciado** | Mezcla de `px-5 py-3.5`, `px-4 py-3`, `p-4` — inconsistente entre paneles del POS | Baja |
| **Productos** | Grid `minmax(140px, 1fr)` puede verse muy apretado en pantallas medianas | Media |
| **Empty states** | Carrito vacío decora con iconos pero no guía al usuario claramente | Baja |
| **Accesibilidad** | Algunos `aria-label` faltan en botones de acción rápida del carrito | Media |
| **Login** | Usa `bg-card/80` inline en vez de token; no usa el componente `<Input>` | Baja |

---

## Plan de Rediseño

### Fase 1: Fundación de Contraste y Accesibilidad
1. **Elevar contraste de textos secundarios** — mínimo `muted-foreground/65` (subir de `/45`)
2. **Auditar todos los `/opacity` en colores** — reemplazar `text-foreground/45` → `text-foreground/70`, `text-muted-foreground/40` → `text-muted-foreground/65`
3. **Agregar `aria-label` faltantes** en iconos de acción del carrito (pausar, descuento, cliente, vaciar)
4. **Focus ring consistente** en todos los inputs nativos (Login usa estilo inline, unificar con `focus-visible:ring-ring/50`)

### Fase 2: Dark Mode Unificado
5. **Eliminar selectores duplicados** — consolidar `[data-mode="dark"]` y `[data-theme="dark"]` en uno solo
6. **Ajustar opacidades de glass en dark** — `--glass-bg-opacity: 0.50` es muy bajo, subir a `0.60`
7. **Mejorar contraste de bordes en dark** — `border-border/8` (8% de un color ya oscuro) es invisible, subir a `border-border/15`

### Fase 3: Diseño Responsivo y Mobile-First
8. **POS layout responsivo completo**:
   - Desktop (≥1280px): 60/40 split actual
   - Tablet (768-1279px): 55/45 split, carrito más estrecho
   - Mobile (<786px): stack vertical — carrito colapsable arriba, productos abajo
9. **Agregar bottom sheet móvil** para el carrito en vez de panel lateral
10. **Touch targets** — verificar que todos los botones tengan `min-h-[44px]` en móvil
11. **Product grid responsive** — `minmax(120px, 1fr)` en móvil, `minmax(160px, 1fr)` en desktop

### Fase 4: Refinamiento Visual 2026
12. **Reducir animaciones** — eliminar `animate-border-glow` del checkout (distrae), mantener solo `scale-in` en modales
13. **Simplificar blur** — usar `backdrop-blur-sm` (4px) en overlays, reservar `blur-lg` solo para modales
14. **Unificar espaciado POS** — carrito header `px-4 py-3`, totales `p-4`, checkout `mt-3`
15. **Mejorar empty state del carrito** — agregar ilustración o animación sutil
16. **Checkout button** — reducir a `min-h-[3.5rem]` en desktop, `min-h-[3rem]` en móvil
17. **Agregar haptic feedback** en numpad keys (ya existe `.haptic-press`, aplicar consistentemente)

### Fase 5: Componentes Premium
18. **Login** — migrar a componente `<Input>` para consistencia
19. **Sale complete overlay** — agregar confetti sutil o check animado más elegante
20. **Toast notifications** — agregar sonido opcional en venta exitosa
21. **Agregar skeleton** al PaymentModal mientras carga productos
22. **QuickProducts** — agregar shimmer loading en vez de skeleton estático

### Fase 6: Polish Final
23. **Auditoría de rendimiento** — eliminar `backdrop-blur` apilados, usar `will-change` solo donde sea necesario
24. **Verificar prefers-reduced-motion** — ya existe, pero asegurar que todas las animaciones lo respeten
25. **Print styles** — mejorar impresión de tickets
26. **Verificar z-index scale** — asegurar que cash gate overlay (z-overlay) esté sobre modales (z-modal)

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `client/src/styles/globals.css` | Unificar dark mode, reducir animaciones excesivas |
| `client/src/styles/themes.css` | Ajustar contrastes dark, opacidades glass |
| `client/src/styles/tokens.css` | Agregar tokens responsive, ajustar touch targets |
| `client/src/views/Sales/index.tsx` | Layout responsive, espaciado unificado, aria-labels |
| `client/src/components/sales/PaymentModal.tsx` | Tamaño responsive, haptic consistente |
| `client/src/components/sales/Cart.tsx` | Empty state mejorado, responsive |
| `client/src/components/sales/QuickProducts.tsx` | Grid responsive, shimmer loading |
| `client/src/components/layout/MainLayout.jsx` | Mobile POS layout |
| `client/src/components/layout/Sidebar.jsx` | Mejorar contraste dark |
| `client/src/components/layout/Topbar.jsx` | Responsive clock/controls |
| `client/src/components/ui/Button.tsx` | Ajustar sizes para POS |
| `client/src/components/ui/Input.tsx` | Unificar focus ring |
| `client/src/views/Login.jsx` | Migrar a <Input>, consistencia |

---

## Decisiones de Diseño

1. **Idioma**: Mantener español (proyecto es LATAM)
2. **Paleta**: Mantener azul enterprise (220/82%) como primario, verde éxito (152/68%)
3. **Tipografía**: Mantener Inter + JetBrains Mono
4. **Sidebar**: Mantener colapsable, no eliminar
5. **Glassmorphism**: Reducir intensidad, no eliminar — es parte de la identidad 2026
6. **Animaciones**: Solo las funcionales (entrada/salida), eliminar las decorativas infinitas
7. **Mobile**: Layout adaptativo, no app separada

---

## Validación

1. `npm run dev` — verificar que no hay errores de build
2. `npm run test` — tests existentes pasan
3. Manual testing:
   - POS en 1920px, 1366px, 1024px, 768px, 375px
   - Dark/light mode toggle
   - Venta completa flujo
   - Modal de pago numpad
   - Carrito vacío → lleno → checkout
   - Cash gate overlay
   - Sidebar collapse/expand
   - Keyboard shortcuts
