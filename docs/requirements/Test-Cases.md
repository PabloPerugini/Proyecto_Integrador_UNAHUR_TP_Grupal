# Documento de Seguimiento de Testing

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 1.0
**Fecha:** 20/09/2026
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. [Nombre del/de la docente]
**Release:** Septiembre 2026

---

## Objetivo

El Documento de Seguimiento de Testing tiene como objetivo principal registrar y hacer seguimiento de los bugs encontrados durante el desarrollo y las pruebas de la aplicación. Proporciona una visión general de los problemas identificados, su estado actual y las acciones tomadas para resolverlos.

La metodología de prueba se describe en el [Plan de Pruebas](./Test-Plan.md).

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
| BUG-001 | El lector importaba la fila de totales de cierre ("TÍTULO: ...") como una materia. | 1. Subir un PDF de plan en formato columnar compacto.<br>2. Revisar las materias importadas. | Alta | Resuelto | Equipo | 2026-09-10 | 2026-09-15 | Se filtra la fila de totales y se agrega soporte para el formato columnar compacto. |
| BUG-002 | El matching de correlativas por embeddings sugería pares falsos entre materias no relacionadas. | 1. Subir un plan de estudios.<br>2. Inspeccionar las correlativas sugeridas por IA. | Media | Resuelto | Equipo | 2026-09-11 | 2026-09-18 | Se configura un umbral mínimo de similitud (`EMBEDDINGS_MIN_SIMILARITY`, default 0.8). |
| BUG-003 | Con la cookie de sesión expirada, el frontend quedaba en espera sin desloguear al usuario. | 1. Iniciar sesión.<br>2. Esperar la expiración de la cookie.<br>3. Navegar a una sección protegida. | Media | Resuelto | Equipo | 2026-09-16 | 2026-09-20 | La API responde `401` y el frontend fuerza el logout automático. |
| BUG-004 | El `backend/Dockerfile` de producción no contempla el modo dev configurado en `compose.yaml`. | 1. Ejecutar `docker compose up` en modo dev.<br>2. Observar la imagen construida. | Media | Abierto | Equipo | 2026-09-20 | — | Pendiente de definir con el equipo si el contenedor corre en modo dev o prod. |