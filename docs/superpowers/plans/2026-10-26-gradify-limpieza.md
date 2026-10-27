# Limpieza, corpus y estilos — Gradify

**Goal:** limpiar temporales, deduplicar corpus, consolidar tests, validar carga real de PDFs, centralizar CSS y ordenar estructura, sin romper el golden ni la UI.

**Spec:** decisiones acordadas en la sesión del 26/10 (todo lo recomendado). Fuente de verdad del corpus: `files/UNAHUR-Oferta-Academica`.

## Global Constraints

- No borrar `files/*/_obsoletos`, `pruebas.http`, `.env`, `.env.Ejemplo`, `node_modules`.
- Golden: tras cada cambio de parser, `snapshot:planes -- --check` debe quedar sin diferencias.
- El CSS no cambia visualmente: mover y agrupar, no rediseñar.
- Nada de código de prueba temporal sobrevive: solo tests permanentes y gates.
- Conteos objetivo tras deduplicar TUPAP: **56 PDFs = 43 referencia + 13 excluidos**.

## Review Focus

- Duplicados de PDF con hash igual no pueden quedar en la referencia.
- `verificar-institutos` no persiste datos: solo preview, sin confirm.
- CSS: el orden de carga debe mantener el mismo resultado visual.
- Parser dividido en módulos debe exponer exactamente `parseOfficialPlan` y `parseCorrelativas`.

---

### Task 1: Base de ejecución
- [x] Crear rama `chore/limpieza-y-validacion`, commitear WIP (sin `tmp-*`).
- [x] Línea base: `npm test`, `test:jest`, `test:cobertura`, `snapshot --check`, `lint`, `build`.

### Task 2: Limpieza de temporales
- [x] Borrar 19 `backend/tmp-*`, vaciar `backend/scripts/informes/`, borrar `frontend/dist/`.
- [x] `git status` sin basura; tests verdes.

### Task 3: Corpus y duplicados
- [x] Eliminar PDF TUPAP viejo, entrada en referencia y golden.
- [x] Regenerar golden y actualizar conteos (README, comentarios de scripts).
- [x] Extender `check-cobertura.js`: gate por hash repetido + resumen por instituto.
- [x] `npm run test:cobertura` y `snapshot --check` verdes.

### Task 4: Consolidar tests
- [x] Escribir `backend/tests/codes.test.js` para `uniqueSubjectCodes`.
- [x] Frontend: borrar scripts rotos `test:status`, `test:graph`, `test:layout`.
- [x] `npm test`, `test:jest`, tests de frontend verdes.

### Task 5: Test por instituto
- [x] `backend/scripts/verificar-institutos.test.js` + `npm run test:institutos`, integrado a `validar`.
- [x] Corrido verde con corpus.

### Task 6: Prueba real por HTTP
- [x] Levantar backend + Mongo/Redis (docker compose o local).
- [x] Upload real de un PDF por instituto: `preview` + `confirm`, casos negativos, suites E2E.
- [x] Revertir/limpiar cualquier código temporal creado aquí.

### Task 7: CSS centralizado
- [x] `frontend/src/styles/` con partials y `index.css` como único import en `main.tsx`.
- [x] Mover `SplashScreen.css` y `AcademicMap.css` a `styles/`.
- [x] Comentarios por sección; tokens para colores reutilizables.
- [x] `lint`, `build`, y comparación visual light/dark contra baseline.

### Task 8: Estructura y buenas prácticas
- [x] Borrar código muerto confirmado (canvas del mapa, ColorDot).
- [x] Capas backend: no modelos en controllers de `progress`/`user`; lógica fuera de `planSubject.routes.js`.
- [x] Dividir `pdfParser.service.js` en `services/pdf/` manteniendo API pública y golden.
- [x] ESLint backend + `npm run lint`; `docs/ARCHITECTURE.md` y `docs/CSS.md`.

### Task 9: Cierre
- [x] Todos los gates verdes; reporte final; integración diferida (rama local).
