# ✅ Checklist de Lanzamiento - Ventify v1.0

Este documento asegura que el sistema esté listo para producción.

## 1. Infraestructura & Despliegue
- [ ] **Docker**: `docker-compose up -d` corre sin errores.
- [ ] **Variables de Entorno**: `.env` configurado con credenciales de producción (Postgres, JWT secret, etc).
- [ ] **SSL/TLS**: Proxy reverso (Nginx/Traefik) configurado con HTTPS.
- [ ] **Logs**: Verificación de salida de logs estructurados (Pino) en el backend.

## 2. Base de Datos
- [ ] **Migraciones**: `npx prisma migrate deploy` ejecutado exitosamente.
- [ ] **Seeds**: Datos iniciales (roles, categorías base) cargados.
- [ ] **Backups**: Cronjob configurado para `pg_dump` diario.

## 3. Configuración de Negocio (Tenant Inicial)
- [ ] **Datos Fiscales**: RFC, Razón Social, Dirección cargados en `/config`.
- [ ] **Impresora**: Ticket de prueba impreso correctamente (ancho 80mm/58mm).
- [ ] **Usuarios**: Cuenta Admin creada y contraseña segura establecida.

## 4. Frontend & UX
- [ ] **Build**: `npm run build` genera assets minificados sin errores.
- [ ] **Assets**: Logo e iconos cargan correctamente.
- [ ] **PWA**: Service Worker registrado para soporte offline básico.

## 5. Seguridad
- [ ] **Firewall**: Puertos DB (5432) cerrados al público.
- [ ] **Rate Limiting**: Middleware de seguridad activo y probado.
- [ ] **Headers**: Helmet activo (HSTS, No-Sniff).

## 6. Soporte & Recuperación
- [ ] **Canales**: Email de soporte configurado en el sistema.
- [ ] **Documentación**: Entregar `user-guide.md` al cliente.
