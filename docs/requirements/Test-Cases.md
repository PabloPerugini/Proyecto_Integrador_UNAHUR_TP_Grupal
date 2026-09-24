# Documento de Seguimiento de Testing

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 2.0
**Fecha:** 2026-09-24
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
