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
- [ ] Crear rama `chore/limpieza-y-validacion`, commitear WIP (sin `tmp-*`).
- [ ] Línea base: `npm test`, `test:jest`, `test:cobertura`, `snapshot --check`, `lint`, `build`.

### Task 2: Limpieza de temporales
- [ ] Borrar 19 `backend/tmp-*`, vaciar `backend/scripts/informes/`, borrar `frontend/dist/`.
- [ ] `git status` sin basura; tests verdes.

### Task 3: Corpus y duplicados
- [ ] Eliminar PDF TUPAP viejo, entrada en referencia y golden.
- [ ] Regenerar golden y actualizar conteos (README, comentarios de scripts).
- [ ] Extender `check-cobertura.js`: gate por hash repetido + resumen por instituto.
- [ ] `npm run test:cobertura` y `snapshot --check` verdes.

### Task 4: Consolidar tests
- [ ] Escribir `backend/tests/codes.test.js` para `uniqueSubjectCodes`.
- [ ] Frontend: borrar scripts rotos `test:status`, `test:graph`, `test:layout`.
- [ ] `npm test`, `test:jest`, tests de frontend verdes.

### Task 5: Test por instituto
- [ ] `backend/scripts/verificar-institutos.test.js` + `npm run test:institutos`, integrado a `validar`.
- [ ] Corrido verde con corpus.

### Task 6: Prueba real por HTTP
- [ ] Levantar backend + Mongo/Redis (docker compose o local).
- [ ] Upload real de un PDF por instituto: `preview` + `confirm`, casos negativos, suites E2E.
- [ ] Revertir/limpiar cualquier código temporal creado aquí.

### Task 7: CSS centralizado
- [ ] `frontend/src/styles/` con partials y `index.css` como único import en `main.tsx`.
- [ ] Mover `SplashScreen.css` y `AcademicMap.css` a `styles/`.
- [ ] Comentarios por sección; tokens para colores reutilizables.
- [ ] `lint`, `build`, y comparación visual light/dark contra baseline.

### Task 8: Estructura y buenas prácticas
- [ ] Borrar código muerto confirmado (canvas del mapa, ColorDot).
- [ ] Capas backend: no modelos en controllers de `progress`/`user`; lógica fuera de `planSubject.routes.js`.
- [ ] Dividir `pdfParser.service.js` en `services/pdf/` manteniendo API pública y golden.
- [ ] ESLint backend + `npm run lint`; `docs/ARCHITECTURE.md` y `docs/CSS.md`.

### Task 9: Cierre
- [ ] Todos los gates verdes; reporte final; PR.
