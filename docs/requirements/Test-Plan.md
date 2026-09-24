# Plan de Pruebas

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.0
**Fecha:** 24/09/2026
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo del Testing

Garantizar que la aplicación web (React) y su API REST (Node/Express + MongoDB + Redis) funcionen correctamente para: carga de planes de estudios en PDF (plan, correlativas e historial), detección de materias y correlatividades, visualización en grafo/tablero, seguimiento del progreso académico y manejo de errores.

## Alcance del Testing

- Pruebas de funcionamiento de los endpoints de la API (`/careers`, `/progress`, `/health`) y de la documentación en `/api-docs`.
- Validación de la carga de PDF: plan oficial, PDF de correlativas y archivo con estructura inesperada; descarte de filas de totales y de títulos de sección.
- Verificación del **matching clásico** de correlativas (exacto, compacto, difuso y por prefijo) y del nivel de confianza devuelto (`exact` | `compact` | `fuzzy` | `null`).
- Verificación del **título intermedio**: detección en el PDF, `creditsIntermediate` / `intermediateTitle`, materias marcadas `intermediate` y banner de progreso en el grafo.
- Verificación de la identificación anónima del progreso (header `x-user-id`: `401` si falta en `/progress`).
- Verificación del manejo centralizado de errores (`400` IDs/validaciones/archivos, `404` inexistente, `500` genérico) y de que el proceso no se cae.
- Verificación de planes extensos y de formatos inesperados.
- Verificación de la interfaz: navegación entre layouts, estados de materia, camino crítico, accesibilidad básica y comportamiento de `ErrorBoundary`.

## Herramientas para el Testing

### Pruebas individuales
**Descripción:** se utilizará **Postman** como herramienta complementaria para pruebas durante el desarrollo de la API: enviar solicitudes HTTP (incluido el header `x-user-id`) y revisar las respuestas de forma interactiva. También se usará el navegador con DevTools para las vistas del frontend.

**Funcionalidades principales:**
- Envío de solicitudes HTTP con y sin el header `x-user-id`.
- Visualización de respuestas JSON de forma estructurada.
- Pruebas manuales exploratorias de los flujos de la aplicación (subir PDF, explorar grafo, marcar progreso).

### Verificación estática y de compilación
**Descripción:** chequeo de sintaxis del backend con `node --check` sobre `src/` y verificación del frontend con las herramientas del proyecto (`eslint`, `tsc -b` y `vite build`). Se ejecutan antes de cada entrega; **el proyecto no tiene suite de tests unitarios automatizados**.

**Funcionalidades principales:**
- Detectar errores de sintaxis en el backend sin necesidad de levantar el entorno.
- Detectar errores de tipos y de lint en el frontend.
- Confirmar que el build de producción se completa.

### Pruebas masivas
**Descripción:** se desarrollarán scripts de automatización en **Python + Requests** para ejecutar pruebas masivas sobre la API: enviar solicitudes con diferentes PDFs/datos y evaluar los resultados para detectar inconsistencias.

**Funcionalidades principales:**
- Carga automática de conjuntos de PDFs de prueba (distintas carreras y formatos).
- Envío masivo de solicitudes (carga de planes, consultas de correlativas, progreso).
- Análisis automático de respuestas para detectar errores o anomalías.

## Casos de Prueba

1. **Salud y documentación**
   - Caso 1: **Salud.** `GET /health` → `200` con `{ "status": "ok" }` y `GET /` → `200` con el índice de la API.
   - Caso 2: **Swagger.** Abrir `/api-docs` y verificar que el documento carga y que los paths listados son los reales (`/careers`, `/progress`, `/health`).

2. **Carga de planes de estudio**
   - Caso 3: **PDF del plan oficial.** `POST /careers/:id/parse-official` con el PDF en el campo `file` → `200` con `subjects`, `detectedCount`, `sourceKind`, `creditsFinal`, `creditsIntermediate` e `intermediateTitle`.
   - Caso 4: **Sin archivo.** La misma petición sin `file` → `400` con mensaje claro.
   - Caso 5: **Fila de totales.** Con un plan que cierre con una fila de totales ("TOTAL…"/"TÍTULO: …"), verificar que **no** se importe como materia.
   - Caso 6: **PDF escaneado o ilegible.** Enviar un PDF sin texto → `400` "No se pudo leer el PDF…" y el servidor sigue operativo.
   - Caso 7: **No-PDF.** Enviar un archivo que no es PDF → `400` "Solo se aceptan archivos PDF"; superar los 10 MB → `400` por tamaño.
   - Caso 8: **PDF de correlativas.** `POST /careers/:id/parse-correlativas` → filas con `confidence` (`exact` | `compact` | `fuzzy` | `null`) y guardado con `POST /careers/:id/correlativas`.

3. **Progreso académico**
   - Caso 9: **Sin identificación.** `POST /progress` y `GET /progress/me` sin header `x-user-id` → `401`.
   - Caso 10: **Marcar progreso.** Actualizar el estado de una materia (Aprobada/Regular/Cursando/Pendiente) y verificar que se recalcule el desbloqueo de correlativas y los créditos acumulados.

4. **Grafo de correlatividades**
   - Caso 11: **Estructura.** `GET /careers/:id/graph` → `nodes`, `edges`, `availableNow`, `criticalPath`, `hasCycle`, `topologicalOrder` y `stats` (totales, aprobadas, disponibles, créditos).
   - Caso 12: **Título intermedio.** En una carrera con título intermedio, verificar `graph.intermediate` (`title`, `total`, `aprobadas`, `credits`, `creditsAprob`) y el banner en la interfaz; en una sin título intermedio, verificar que no se muestre.
   - Caso 13: **IDs inválidos.** `GET /careers/abc` → `400`; `GET /careers/<id inexistente>` → `404`.

5. **Administración de planes**
   - Caso 14: **Alta y duplicados.** `POST /careers` sin `name` → `400`; con un nombre ya existente (ignorando mayúsculas/acentos) → `200` con `reused: true` en lugar de crear otro.
   - Caso 15: **Publicación.** `POST /careers/:id/publish` → `status: "published"` y `subjectCount` actualizado; `GET /careers?status=` filtra por estado.
   - Caso 16: **Edición y borrado.** `PATCH /careers/:id` sobre `name`, `institute`, `color`, `planResolution`, `ruleCode`, `durationYears`, `creditsFinal` y `creditsIntermediate` (nombre vacío → `400`); `DELETE /careers/:id` → `200` con `deleted`/`deletedId` y elimina materias y progreso asociados.

6. **Manejo de errores**
   - Caso 17: **JSON inválido.** `POST /careers` con cuerpo mal formado → `400` "JSON inválido en el cuerpo de la solicitud".
   - Caso 18: **Validaciones de Mongoose.** Enviar datos inválidos (p. ej. sin `code` en una materia) → `400` con los mensajes de validación.
   - Caso 19: **Error interno.** Provocar un error inesperado → `500` con mensaje genérico, el detalle queda registrado en el servidor y el proceso sigue vivo.

7. **Interfaz**
   - Caso 20: **Navegación.** Recorrer `/` → `/cargar` → `/admin` → `/grafo` → `/tablero` → `/progreso` → una ruta inexistente (404), verificando que cada una renderiza dentro de su layout (usuario o administrador).
   - Caso 21: **Estados en el grafo.** Cambiar el estado de una materia habilitada y verificar el cambio de color, el desbloqueo de las sucesoras y la actualización de la barra de progreso y del camino crítico.
   - Caso 22: **Errores en la interfaz.** Detener el backend y realizar una acción → mensaje "No se pudo conectar con el servidor" sin que la pantalla se rompa (`ErrorBoundary`).
   - Caso 23: **Accesibilidad.** Verificar que los selectores y campos de *Mi progreso* y *Admin* tengan `aria-label` descriptivos, que la zona de arrastre sea operable por teclado (`role="button"`), que los loaders usen `role="status"`, que los mensajes usen `role="alert"` y que las barras de progreso expongan `role="progressbar"`.

## Plan de Ejecución

1. Configurar un entorno de prueba (backend en puerto 3000, frontend en puerto 5173, MongoDB y Redis locales).
2. Preparar los casos de prueba y los PDFs de muestra (plan oficial, PDF de correlativas, plan con fila de totales, PDF escaneado, plan extenso).
3. Ejecutar cada caso de prueba sobre los endpoints y flujos relevantes.
4. Registrar los resultados en el [Documento de Seguimiento de Testing](./Test-Cases.md), incluyendo errores o comportamientos inesperados.
5. Repetir las pruebas tras cada corrección para confirmar estabilidad y consistencia.

## Resultados de la Última Ejecución (24/09/2026)

- **Backend:** `node --check` sobre `backend/src` → **20/20 archivos OK**.
- **Frontend:** `npm run lint` (ESLint) sin errores ni warnings; `npx tsc -b` sin errores; `npm run build` OK (build en 330 ms).
- **Casos HTTP (1–19):** pendientes de ejecución sobre un entorno con MongoDB y Redis levantados.

## Plan de Pruebas Adicionales (Opcionales)

**Prueba de calidad a gran escala:** ejecutar múltiples cargas de distintos planes (varias carreras y formatos) para garantizar que la importación y el matching de correlativas mantengan un alto nivel de calidad bajo una carga significativa.
