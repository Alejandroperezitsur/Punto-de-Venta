# Plan: Revisión Completa del Código — POS Pro 2026

## Resumen Ejecutivo

Revisión sistemática de frontend, backend, UI/UX, tokens, y configuración. Se encontraron **82 errores de ESLint** (todos de parsing por falta de parser TypeScript en `.eslintrc.json`) y **~25 errores de TypeScript** en archivos `.ts`/`.tsx`. Además se identificaron problemas de arquitectura, consistencia y robustez.

---

## 🔴 BLOQUEOS CRÍTICOS (Impiden build/lint correcto)

### 1. ESLint no soporta TypeScript
- **Archivo**: `client/.eslintrc.json`
- **Problema**: Usa `eslint:recommended` sin parser de TypeScript. Todos los archivos `.ts`/`.tsx` fallan con errores de parsing (`interface`, `type`, `:`, etc.)
- **Impacto**: 82 errores, lint es inútil actualmente
- **Fix**: Instalar `@typescript-eslint/parser` y `@typescript-eslint/eslint-plugin`, actualizar config

### 2. TypeScript — 25+ errores de tipos
- **Archivos afectados**:
  - `client/src/components/ui/index.ts` — `ModalSteps` no exportado desde `Modal.tsx`
  - `client/src/lib/reconciliationEngine.ts` — exports faltantes (`reconcileStock`, `getConflictHistory`)
  - `client/src/lib/incidentForensics.ts` — template literals no asignables a tipo `ForensicEventType`
  - `client/src/lib/lifecycleGuard.ts` — `TimerHandler` no callable
  - `client/src/lib/productionGovernor.ts` — propiedad `telemetryCountThisMinute` no existe
  - `client/src/lib/storageLifecycleManager.ts` — string no asignable a tipo de store names
  - `client/src/lib/syncStateMachine.ts` — `string[]` no asignable a `never[]`
  - `client/src/lib/degradedModeEngine.ts` — string no asignable a `QueueItemType`
  - `client/src/lib/dataConsistency.ts` — `"warn"` no asignable a `"pass" | "fail"`
  - `client/src/lib/crypto.ts` — `Uint8Array` incompatible con `BufferSource`
  - `client/src/lib/transactionalQueue.ts` — `packetLossThreshold` no existe en `NetworkQualityDetector`
  - `client/src/lib/alertingEngine.ts` — `encodeKey` es privado
  - `client/src/components/dev/PerformanceOverlay.tsx` — `count` es `unknown`

---

## 🟡 PROBLEMAS DE ARQUITECTURA / ROBUSTEZ

### 3. Token Rotation — Seguridad y corrección
- **Archivo**: `server/routes/auth.js:216-229`
- **Problema**: `attachTokenRotation` genera un nuevo JWT en **cada respuesta** (incluyendo errores 4xx/5xx). Esto:
  - Rota tokens incluso cuando la request falló
  - Puede causar inconsistencias si el cliente actualiza el token en responses de error
  - No valida que `req.user` tenga los campos correctos antes de firmar
- **Fix**: Solo rotar en respuestas exitosas (2xx), mover dentro de `responseHandler`

### 4. Rate Limiting — Orden de middlewares
- **Archivo**: `server/index.ts:95-98`
- **Problema**: `loginLimiter` y `apiLimiter` se aplican a `/api/auth` en orden incorrecto. `cashLimiter` tiene ventana de 5s con max 10 — demasiado restrictivo para operaciones de caja normales
- **Fix**: Reordenar middlewares, ajustar `cashLimiter` a ventana más amplia

### 5. `responseHandler` import usa `.js` pero archivo es `.ts`
- **Archivo**: `server/index.ts:41`
- **Problema**: `import { responseHandler } from './middleware/responseHandler'` — el archivo real es `responseHandler.ts`. En desarrollo con `ts-node` funciona, pero es inconsistente con otros imports que sí usan extensión
- **Nota**: No es bug actualmente pero es frágil

### 6. `errorHandler` import usa `.js` pero archivo es `.ts`
- **Archivo**: `server/index.ts:42`
- **Mismo problema** que #5

### 7. `rateLimiter` import usa `.js` pero archivo es `.ts`
- **Archivo**: `server/index.ts:40`
- **Mismo problema** que #5

### 8. `authModule` — mezcla de CommonJS y ES modules
- **Archivo**: `server/index.ts:17`
- **Problema**: `import authModule from './routes/auth'` usa default import pero `auth.js` usa `module.exports = { router, auth, ... }`. Funciona pero es inconsistente con otros routers que usan `require()` directo
- **Fix**: Usar `const { router: authRouter, auth, attachTokenRotation } = require('./routes/auth')`

### 9. `require` dinámico de cron
- **Archivo**: `server/index.ts:143`
- **Problema**: `const { startCron } = require('./cron')` — mezcla de ES imports con CommonJS require dinámico
- **Fix**: Mover a import estático o usar `import()`

### 10. `ensureConfig()` se llama DESPUÉS de `app.listen()`
- **Archivo**: `server/index.ts:141-146`
- **Problema**: `ensureConfig()` valida JWT_SECRET y otras vars de entorno, pero se llama después de `app.listen()`. Si falta config, el servidor ya está escuchando
- **Fix**: Mover `ensureConfig()` ANTES de `app.listen()`

### 11. `PaymentModal` — `ModalSteps` no exportado
- **Archivo**: `client/src/components/ui/Modal.tsx`
- **Problema**: `ui/index.ts` intenta exportar `ModalSteps` pero no existe export en `Modal.tsx`
- **Fix**: Agregar export o remover de `index.ts`

### 12. `Badge.tsx` — falta `key` en dot span
- **Archivo**: `client/src/components/ui/Badge.tsx:46-51`
- **Problema**: El `<span>` del dot indicator no tiene key cuando se renderiza en contexto de lista
- **Fix**: Agregar `key="dot"` al span

### 13. `Cart.tsx` — `ROW_HEIGHT` fijo con virtualización
- **Archivo**: `client/src/components/sales/Cart.tsx:10`
- **Problema**: Altura fija de 66px por row. Si el contenido varía (e.g., items con nombre largo), se desalinean
- **Fix**: Usar `measureElement` en el virtualizer para alturas dinámicas

### 14. `Sales/index.tsx` — `totals` recalculado en render
- **Archivo**: `client/src/views/Sales/index.tsx:488-503`
- **Problema**: Los totales se recalculan con `useMemo` en cada render del componente principal, pero también existen en `cartStore.getTotals()`. Duplicación de lógica
- **Fix**: Usar `getTotals()` del store como fuente única de verdad

### 15. `cartStore` — `hydrate` llamado múltiples veces
- **Archivo**: `client/src/App.jsx:107` y `client/src/views/Sales/index.tsx:243`
- **Problema**: `hydrate()` se llama en `App.useEffect` y también en `SalesView.useEffect`. Puede causar doble carga del carrito persistido
- **Fix**: Llamar `hydrate` solo una vez en el nivel más alto

### 16. `Login.jsx` — no maneja `requireStoreSelection`
- **Archivo**: `client/src/views/Login.jsx:28-33`
- **Problema**: El backend puede responder con `{ requireStoreSelection: true, stores, tempToken }` para usuarios multi-tienda, pero el login del frontend no lo maneja — simplemente llama `login(res.user, res.token)` que fallará
- **Fix**: Agregar UI para selección de tienda cuando `requireStoreSelection` es true

### 17. `seed.js` — no crea datos de prueba (productos, categorías)
- **Archivo**: `server/seed.js`
- **Problema**: Solo crea reseller, store, admin user, license. No crea productos, categorías, clientes, ni settings por defecto (como `tax_rate`)
- **Fix**: Agregar seed data completa para desarrollo

### 18. `salesService.js` — `deleteSaleWithReversal` no maneja `Invoice`
- **Archivo**: `server/services/salesService.js:230-283`
- **Problema**: Al revertir una venta, elimina payments, saleItems, receivables, pero no elimina/revierte `Invoice` asociada
- **Fix**: Agregar `tx.invoice.deleteMany({ where: { sale_id } })` en la transacción

### 19. `themes.css` — variables HSL compuestas usan `var()` anidado
- **Archivo**: `client/src/styles/themes.css:145-195`
- **Problema**: `--primary: var(--primary-h) var(--primary-s) var(--primary-l)` — esto produce `220 82% 22%` sin `hsl()`. Luego en `globals.css` se usa `hsl(var(--primary))` que funciona, pero si alguien usa `var(--primary)` directamente obtiene un valor HSL sin wrapper
- **Nota**: Funcional pero frágil — documentar que siempre debe usarse `hsl(var(--x))`

### 20. `globals.css` — `@theme inline` mapea tokens a CSS vars con `hsl()`
- **Archivo**: `client/src/styles/globals.css:9-80`
- **Problema**: `--color-primary: hsl(var(--primary))` — Tailwind v4 usa estos para generar utilidades. Pero `var(--primary)` ya es `220 82% 22%` (sin hsl), entonces `hsl(var(--primary))` = `hsl(220 82% 22%)` ✓. Esto es correcto pero muy dependiente del orden de carga de CSS files
- **Riesgo**: Si `tokens.css` o `themes.css` no cargan antes que `globals.css`, los valores serán inválidos

---

## 🟢 MEJORAS UI/UX

### 21. `Login.jsx` — contraste de texto en modo oscuro
- Los inputs usan `bg-card/80` que en modo oscuro puede tener contraste insuficiente con `text-foreground`
- **Fix**: Agregar `bg-surface` explícito o verificar contraste WCAG AA

### 22. `Sales/index.tsx` — Cash Gate usa `window.location.hash`
- **Archivo**: `client/src/views/Sales/index.tsx:846`
- **Problema**: `window.location.hash = '#/caja'` — esto fuerza navegación full-page en vez de usar `useNavigate()` de React Router. Causa re-mount completo
- **Fix**: Usar `navigate('/caja')` con `useNavigate()`

### 23. `Sales/index.tsx` — `printTicket` usa iframe sin cleanup garantizado
- **Archivo**: `client/src/views/Sales/index.tsx:297-367`
- **Problema**: El iframe se remueve con `setTimeout(3000)` pero si el usuario cierra la ventana antes, puede quedar orphan
- **Fix**: Usar `iframe.contentWindow?.print()` con `onafterprint` para cleanup

### 24. `CommandPalette` — import sin extensión
- **Archivo**: `client/src/views/Sales/index.tsx:12`
- **Problema**: `import { CommandPalette, ShortcutsOverlay, useKeyboardShortcuts } from '../../components/common/CommandPalette'` — el archivo es `CommandPalette.tsx`
- **Fix**: Agregar extensión o configurar resolver

### 25. `Topbar`, `Sidebar`, `MainLayout` — no revisados a fondo
- Los archivos de layout no fueron leídos en detalle. Revisar consistencia de tokens y responsive behavior

---

## 📋 CHECKLIST DE VALIDACIÓN

- [ ] ESLint pasa sin errores (82 errores de parsing)
- [ ] TypeScript `tsc --noEmit` pasa sin errores (~25 errores)
- [ ] `npm run build` (cliente) completa exitosamente
- [ ] `npm run build` (servidor) completa exitosamente
- [ ] Login funciona (admin / admin123)
- [ ] Crear venta funciona end-to-end
- [ ] Token rotation funciona (header X-New-Token)
- [ ] Tema claro/oscuro/corporativo funciona
- [ ] Responsive en 1024px+ (POS layout)
- [ ] Offline mode no cae con errores de tipos

---

## ORDEN DE IMPLEMENTACIÓN SUGERIDO

1. **Fix ESLint** (problema #1) — desbloquea todo lo demás
2. **Fix TypeScript errors** (#2) — correcciones de tipos
3. **Fix `ensureConfig` antes de `listen`** (#10) — crítico para producción
4. **Fix `requireStoreSelection`** (#16) — bug funcional en multi-tienda
5. **Fix `ModalSteps` export** (#11) — desbloquea typecheck
6. **Fix token rotation** (#3) — seguridad
7. **Fix `deleteSaleWithReversal`** (#18) — integridad de datos
8. **Fix `hydrate` duplicado** (#15) — robustez del carrito
9. **Fix seed data** (#17) — developer experience
10. **Mejoras UI/UX** (#21-24) — pulido final
