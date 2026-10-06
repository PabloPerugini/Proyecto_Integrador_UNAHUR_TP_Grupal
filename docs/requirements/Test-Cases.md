# Documento de Seguimiento de Testing

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.1
**Fecha:** 2026-09-30
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo

El Documento de Seguimiento de Testing tiene como objetivo principal registrar y hacer seguimiento de los bugs encontrados durante el desarrollo y las pruebas de la aplicación. Proporciona una visión general de los problemas identificados, su estado actual y las acciones tomadas para resolverlos.

La metodología de prueba se describe en el [Plan de Pruebas](./Test-Plan.md).

> [!NOTE]
> El registro cubre solo los bugs de la **implementación actual**. Los hallazgos correspondientes a funcionalidades que ya no forman parte de la aplicación (autenticación, roles, recuperación de contraseña, chat con IA, matching por embeddings, Docker Compose, suites de tests) se retiraron en la versión 2.0 de este documento.

## Formato del Documento

El Documento de Seguimiento se organiza en forma de tabla, con las siguientes columnas:

1. **ID del Bug:** identificador único para cada bug encontrado.
2. **Descripción:** descripción breve del problema.
3. **Pasos para Reproducir:** pasos detallados para reproducir el bug.
4. **Prioridad:** alta, media o baja.
5. **Estado:** abierto, en proceso, resuelto o cerrado.
6. **Responsable:** miembro del equipo responsable.
7. **Fecha de Creación:** fecha de identificación inicial del bug.
8. **Fecha de Resolución:** fecha de resolución (si corresponde).
9. **Notas/Comentarios:** información adicional sobre el bug o su resolución.

## Seguimiento y Gestión de Bugs

- El documento se actualizará regularmente a medida que se identifiquen, resuelvan o avancen los bugs.
- Se dará retroalimentación sobre el estado de los bugs durante las reuniones de seguimiento del proyecto.
- Se realizarán pruebas adicionales para verificar que los bugs resueltos no hayan reintroducido problemas.

## Registro de Bugs

| ID | Descripción | Pasos para Reproducir | Prioridad | Estado | Responsable | Fecha de Creación | Fecha de Resolución | Comentarios |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | El lector importaba la fila de totales de cierre ("TÍTULO: ..." / "TOTAL ...") como una materia. | 1. Subir un PDF de plan con fila de totales al final.<br>2. Revisar las materias importadas. | Alta | Resuelto | Equipo | 2026-09-10 | 2026-09-15 | El parser descarta las filas de totales y los títulos de sección (`TAB_TOTAL_RE`) antes de emitir materias, y solo considera fila con datos cuando trae números reales. |
| BUG-002 | El parser no reconoce el dialecto `Asignatura\|Campo\|Carga\|Correlatividad` sin columna D ni duración C/A (Tec. Producción Agroecológica, Tec. Mantenimiento Hospitalario): devuelve 0 materias. | 1. `npm run test:planes` con esos PDFs.<br>2. Ver `detectedCount: 0`. | Media | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Agroecológica nativa (23, anclas número+Campo con gate que respeta columna Código/duración ajenas); Mant. Hospitalario nativo por "Cuatr.". En el camino el gate rompió 6 planes sanos (mismo vocabulario de encabezado) y la red golden lo detectó: gate final solo sin código ni duración. |
| BUG-003 | El dialecto `Nro\|Materia\|Hs\|Créditos\|Correlativas\|Equivalencia` con el número pegado al nombre (Tec. en Inteligencia Artificial) devuelve 0 materias. | 1. Subir `planes-carreras-informatica-para-web-ia.pdf`.<br>2. Ver `detectedCount: 0`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | Rescatado por fallback IA (20 materias, OK-IA). Además se corrigió la referencia: no es un PDF combinado, es el plan de la Tec. en IA. |
| BUG-004 | El PDF de correlativas de Diseño Industrial (layout de 2 columnas sin números de fila) devuelve 0/0 y `POST correlativas` con arreglo vacío responde 400. | 1. Cargar el plan de Diseño Industrial.<br>2. `POST /careers/:id/parse-correlativas` con el RCS-028_25. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | La IA extrae pares literales del PDF (sin inventar códigos) y el matcher determinístico los resuelve: solo exact+compact a `aiSuggested` para aplicar en Editar plan; el guardado sigue manual y blindado. |
| BUG-005 | Matching bajo de correlativas con nombres envueltos en varias líneas (Obstetricia 6/35, Nutrición 17/48). | 1. Cargar el plan y luego su PDF de correlativas.<br>2. Ver `matchedCount/total < 0,7`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-30 | Fix A (30/09): el parser redirige fragmentos al ancla correcta (cierre `-` + nombre completo + banda) → Obstetricia 23/35 y Nutrición 41/48 solo determinístico (E2E `test:salud`). La IA lectora cubre el resto con evidencia; ningún código proviene de la IA. |
| BUG-006 | Lic. en Ciberseguridad: 8 materias quedan sin año asignado. | 1. `npm run test:planes`.<br>2. Ver aviso `materias sin año` en el informe. | Baja | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Los subtotales "TOTAL PRIMER AÑO" vienen al cierre: el parser ahora asigna el año retroactivo (`fillRetroactiveYear`). Verificado E2E: 0 sin año, golden diff=0 en el resto. |
| BUG-007 | El script masivo marcaba SKIP la correlativa de Mantenimiento por un typo en la ruta par de `planes-referencia.json`. | 1. `npm run test:planes`.<br>2. Ver `SKIP: sin plan par`. | Baja | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | Corregida la ruta en la referencia; ahora matchea 26/33. |
| BUG-008 | Groq responde 413 ante extracciones de ~25 mil caracteres y Gemini 503/429 intermitente (modelo saturado / cuota gratuita). | 1. Subir un plan de dialecto no soportado con IA configurada.<br>2. Ver `aiFallback: false` y el log `[parse-official]`. | Media | Mitigado | Equipo | 2026-09-24 | 2026-09-24 | Se envían solo las páginas con pinta de tabla (máx. 40 mil caracteres), se prueba Gemini primero en extracción y se reintento una vez ante 429/5xx. Con las keys gratuitas saturadas (~15 llamadas/hora) el fallback puede fallar en forma transitoria: reintentar más tarde. |
| BUG-009 | `POST /careers/:id/correlativas` persistía cualquier código en `requires` sin validar (un código inventado por IA o a mano rompía el grafo) y aceptaba ciclos y autorreferencias. | 1. Guardar `requires` con un código inexistente o un ciclo A→B→A.<br>2. Ver el grafo resultante. | Alta | Resuelto | Equipo | 2026-09-24 | 2026-09-24 | `saveCorrelativas` valida en servidor: descarta códigos inexistentes y autorreferencias (los lista en `dropped`) y rechaza con 400 el lote si crea un ciclo, sin guardar nada. Regresión automática en `npm test` (Fase 3: whitelist + anti-ciclos + BUG-009). |
## Resultados de la Carga Masiva de Planes (2026-09-24)

Corrida `npm run test:planes` sobre los 43 PDFs de `files/UNAHUR-Oferta-Academica`, contra la API real y con limpieza total de carreras `[TEST]` (cero huérfanas al final). Referencia de rangos por tipo en `docs/testing/planes-referencia.json`. Estados: OK (parser), OK-IA (rescatado por IA), WARN (cierra con observaciones), FAIL, SKIP.

| PDF | Tipo | Detectadas | Estado | Detalle |
| --- | --- | --- | --- | --- |
| Ingenieria-Agronomica-EXP.-764-2024.pdf | ingeniería | 59 | OK | 59 persistidas |
| Tecnicatura-Produccion-Agroecologica-Periurbana.pdf | tecnicatura | 23 | WARN | Nativo (dialecto Asignatura\|Campo\|Carga); créditos 0 porque la tabla no trae (1 nombre con cola de ruido) |
| Licenciatura-en-Biotecnologia.pdf | licenciatura | 48 | OK | matching 41/41 correlativas |
| Plan-correlatividades-Biotecnologia | correlativas | 41/41 | OK | — |
| Licenciatura-en-Gestion-Ambiental.pdf | licenciatura | 50 | OK | — |
| Licenciatura-en-Tecnologia-de-los-Alimentos.pdf | licenciatura | 46 | OK | — |
| Tec.-Universitaria-en-Viverismo.pdf | tecnicatura | 25 | OK | — |
| Licenciatura-en-Desarrollo-Agrario.pdf | licenciatura | 41 | OK | — |
| Licenciatura-en-Kinesiologia-y-Fisiatria.pdf | licenciatura | 47 | OK | matching 41/41 correlativas |
| Plan-correlatividades-Kinesiologia | correlativas | 41/41 | OK | — |
| Licenciatura-en-Obstetricia.pdf | licenciatura | 39 | OK | matching 6/35 correlativas (BUG-005) |
| Plan-correlatividades-Obstetricia | correlativas | 6/35 | WARN | matching bajo; IA lectora: 27 exactas + 1 a revisión, cobertura 30/35 vía groq (no guardadas) |
| RCS-385 Plan Licenciatura-en-Enfermeria | licenciatura | 41 | OK | matching 39/39 (anexo RCS-246) |
| RCS-246 Modificación correlatividad Enfermería | correlativas | 39/39 | OK | anexo tabular |
| Licenciatura-en-Nutricion.pdf | licenciatura | 52 | OK | matching 17/48 correlativas (BUG-005) |
| Plan-correlatividades-Nutricion | correlativas | 17/48 | WARN | matching bajo; IA lectora: 13 exactas (1ª medición) / 11 exactas (corrida 5, cobertura 22/48) |
| Ingenieria-en-Energia-Electrica.pdf | ingeniería | 45 | OK | — |
| Ingenieria-Metalurgica.pdf | ingeniería | 49 | OK | — |
| lic-en-ciberseguridad-2026.pdf | licenciatura | 33 | OK | año retroactivo en subtotales (era BUG-006) |
| lic-en-desarrollo-de-videojuegos-2026.pdf | licenciatura | 32 | OK | — |
| lic-informatica-2026.pdf | licenciatura | 46 | OK | — |
| Licenciatura-en-Diseno-Industrial | licenciatura | 37 | OK | correlativas 0/0 (BUG-004) |
| RCS-028_25 correlatividades Diseño | correlativas | 0/0 | WARN | layout sin números; IA lectora pendiente de medición (cuota 429 en corrida 4) |
| Lic-en-Gestion-del-Mantenimiento | licenciatura | 40 | OK | matching 26/32 correlativas |
| RCS-029_25 correlatividades Mantenimiento | correlativas | 26/32 | WARN | prosa resolutiva eliminada (era 26/33 con junk); resto nombres envueltos |
| planes-carreras-informatica-para-web-ia.pdf | tecnicatura (IA) | 0→20 | OK-IA | Es la Tec. en Inteligencia Artificial, dialecto con equivalencias (BUG-003) |
| Tec.-Univ.-en-Electromovilidad.pdf | tecnicatura | 21 | OK | — |
| Tecnicatura-Mantenimiento-hospitalario-1.pdf | tecnicatura | 0→21 | OK | Dialecto con Régimen "Cuatr." ahora nativo (era IA) |
| Plan-correlatividades-Mant.-Hospitalario | correlativas | 6/20 | WARN | matching bajo; IA lectora: 9 exactas aplicables (verificado E2E) |
| Licenciatura-en-Educacion-Presencial-_-A-Distancia.pdf | licenciatura | 19 | OK | CCC 2 años, sin correlativas en web |
| RCS.-008-...-Profesorado-Universitario-de-Chino.pdf | profesorado | 41 | OK | 240 créditos; sin correlativas en web |
| RCS.-431-2024-Profesorado-Universitario-de-Biologia_removed.pdf | profesorado | 41 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Biologia.pdf | correlativas | 37/39 | WARN | 37 matcheadas |
| PLAN-PROFESORADO-UNIVERSITARIO-DE-EDUCACION-FISICA.docx_removed.pdf | profesorado | 44 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-en-Educacion-Fisica-1.pdf | correlativas | 39/39 | OK | — |
| RCS-384-2024-Profesorado-Universitario-de-Ingles_removed.pdf | profesorado | 36 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Ingles.pdf | correlativas | 33/33 | OK | — |
| CS-429-2024-Profesorado-Letras.pdf | profesorado | 39 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Letras-1.pdf | correlativas | 37/38 | WARN | 37 matcheadas |
| RCS-383-2024-Profesorado-Universitario-de-Matematica-2_removed.pdf | profesorado | 37 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Matematica-1.pdf | correlativas | 35/35 | OK | — |
| PLAN-PROFESORADO-UNIVERSITARIO-DE-GEOGRAFIA.docx_removed.pdf | profesorado | 39 | OK | 240 créditos |
| Plan-de-correlatividades-del-Profesorado-Universitario-de-Geografia.pdf | correlativas | 37/37 | OK | — |

**Resumen final (corrida 5, 43 documentos):** OK=34 + OK-IA=1 (Tec. IA 20) + WARN=8 + FAIL=0 + SKIP=0. Instituto de Educación: 8 planes OK + 6 correlativas (4 perfectas, Biología 37/39, Letras 37/38). Informes de cada corrida en `backend/scripts/informes/`.

**Control de Salud (`npm run test:salud`, informe en `backend/scripts/informes/control-salud-*.md`):** Kinesiología 41/41 (20 aristas), Enfermería 39/39 (31 aristas), Obstetricia 6/35 (0 aristas: las 6 reconocidas no tienen prerequisitos), Nutrición 17/48 (7 aristas); ningún ciclo. **Control negativo** (plan sin correlativas): `requires: []` en todo, 0 aristas, `hasCycle: false` y *todas* disponibles (52/52) — sin correlativas no hay bloqueo. Regla de control: aristas > 0 y disponibles < total ⇒ las correlativas se tomaron bien.

## Corrida 6 (30/09/2026, post Fix A + envelope + RN04)

`npm run test:planes` (vía `validaciones.js masiva`) y `npm run test:salud` sobre API real (backend local sin Redis, tolerado por caché en memoria), con limpieza total `[TEST]`.

**Planes: OK=34 + OK-IA=1 (Tec. IA 20 vía gemini) + WARN=8 + FAIL=0 + SKIP=0** — idénticos conteos a corrida 5.

**Correlativas determinísticas (Fix A):** Obstetricia **23/35** (era 6/35), Nutrición **41/48** (era 17/48), Diseño **32/38** (era 0/0), Mant. Hospitalario **14/19** (era 6/20), Mantenimiento 27/31. Resto igual (Kinesiología 41/41, Enfermería 39/39). IA lectora: 8 exactas en Obstetricia vía groq (failover Gemini 503 → Groq verificado en vivo).

**Salud:** mismos números con RN04 activo (sin regresión); negativo 0/52.
