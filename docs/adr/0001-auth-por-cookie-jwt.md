# ADR-0001 — Autenticación por cookie httpOnly con JWT (sin roles)

- **Fecha:** 2026-09-20
- **Estado:** Aceptada
- **Decisores:** Pablo (en coordinación con el grupo)

## Contexto

El proyecto necesita proteger la carga de planes y el progreso de cada usuario. La rama
`develop` eliminó la autenticación durante el refactor de layouts; esta rama la reintegra.

## Decisión

- Autenticación por **JWT en cookie httpOnly**, no en `localStorage` (menos expuesto a XSS).
- El backend emite la cookie al hacer login/registro; `requireAuth` (middleware `auth.js`)
  valida la firma en cada ruta protegida y responde `401` si el token falta o es inválido,
  lo que el frontend usa para limpiar la sesión.
- **Sin roles:** se firma como decisión de producto que todas las funcionalidades están
  disponibles para cualquier usuario autenticado (ver decisión de diseño en BRD §2.7 y
  RN03 en FRD). No se introduce RBAC por ahora.
- Contraseñas con `bcrypt`; `JWT_SECRET` en `.env` (gitignored).

## Consecuencias

- **Positivas:** sesión resistente a XSS; foco simple para un TP; 401 limpio → logout automático.
- **Negativas:** se repite la cookie por más de un destino de despliegue (local/dev/prod)
  requiere marca `secure` según contexto; si el equipo decide "sin auth", este ADR se
  supera con un nuevo registro.
- Requiere coordinar con el grupo: `develop` hoy no tiene login.