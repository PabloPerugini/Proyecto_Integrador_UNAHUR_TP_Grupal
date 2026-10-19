# Propuestas de UI/UX — Gradify UNAHUR

Documento visual para revisar antes de implementar. Fecha: **2026-10-19**.

## Cómo abrirlo

Abrir `ui-ux-20261019.html` con doble clic en Chrome, Edge o Firefox. Los archivos `ui.css` y `ui.js` deben quedar en la misma carpeta. La tipografía Inter se carga desde Google Fonts; sin conexión se usa la fuente del sistema (Segoe UI).

## Contenido

- **Sistema de diseño:** tokens de color, tipografía, radios, estados de validación y componentes.
- **Administración (5 pantallas):** carga del PDF, lectura y validación, revisión editable, importaciones/control de carga y catálogo de carreras.
- **Estudiante (4 pantallas + baja):** inicio, mi progreso, correlatividades y tablero de cursada; el flujo de quitar un plan vive en Inicio.
- **Roadmap:** fases, alcance y métricas de seguimiento.

## Datos de las pantallas

Los datos son ejemplos basados en la última información real disponible; no son datos persistidos ni una migración:

- Preview de Biotecnología: **46 materias**, **393 créditos**, **19 materias / 108 créditos** del título intermedio; laboratorio OF017 con 6 cargas (4/64/40/0/61/125).
- Última carga masiva (16/10/2026): **43 planes** — 27 OK, 1 OK-IA, 15 WARN, 0 FAIL; 1 fallback de IA.
- Diagnóstico de IA y propuestas: `backend/scripts/informes/ia-planes-20261019.md`.

## Estado

Propuesta para validar con el equipo. Se mantienen las decisiones vigentes: sin OCR para los PDFs escaneados, parser determinístico como fuente principal y validación humana antes de publicar.

Primera iteración **ya implementada en la app** (2026-10-19): se quitaron “Ver materias”, “Qué puedo cursar” y “Mi avance” del Inicio, y se agregó “Quitar plan” con baja reversible (`UserStudyPlan.archivedAt`); el resto de las pantallas sigue siendo propuesta.

Segunda iteración visual (misma fecha): los planes inscriptos pasan a **filas amplias** con estado, metadatos y acciones alineadas; tabs segmentadas, acción “Sumar otra carrera” y corrección del shell mobile. No cambia el contrato de la API.

Tercera iteración (misma fecha): **“Archivadas” deja de ser una pantalla propia**. La restauración de carreras se integra a **Catálogo → Carreras** con el interruptor **“Ver archivadas (N)”**; la ruta `/admin/archivadas` y su ítem del menú se eliminaron.

## Decisiones de la revisión

- **Inicio sin duplicar el detalle:** “Ver materias”, “Qué puedo cursar” y “Mi avance” quedan en Mi progreso y en el grafo; Inicio solo muestra los planes y los accesos.
- **Quitar plan desde Inicio:** acción con confirmación. Por defecto el avance **se archiva y no se borra**; el plan se puede recuperar volviendo a inscribirse desde el catálogo, con el progreso intacto. La eliminación definitiva, si se define, será una acción aparte con confirmación reforzada.
- **Admin sin pantalla “Archivadas”:** la restauración de carreras archivadas se resuelve dentro de **Catálogo → Carreras** (interruptor “Ver archivadas”), sin ítem ni ruta propia.
