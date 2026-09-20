# Plan de Pruebas

**Proyecto:** Gradify — Grafo Interactivo de Correlatividades y Seguimiento de Progreso Académico
**Versión:** 1.0
**Fecha:** 20/09/2026
**Sponsor Organización:** Universidad Nacional de Hurlingham (UNAHUR) — Licenciatura en Informática
**Autor:** Equipo del proyecto integrador
**Tutor:** Prof. Alejandra Pinto
**Release:** Septiembre 2026

---

## Objetivo del Testing

Garantizar que la aplicación web (React) y su API REST (Node/Express + MongoDB + Redis) funcionen correctamente para: autenticación por cookie, carga de planes de estudio en PDF, detección de materias y correlatividades (con asistencia de IA), visualización en grafo/tablero y seguimiento del progreso académico.

## Alcance del Testing

- Pruebas de funcionamiento de los endpoints de la API (`/users`, `/careers`, `/progress`, `/health`).
- Validación de la carga de PDF en sus formatos soportados (SIU-Guaraní y formato columnar compacto de Informática).
- Verificación del matching semántico de correlativas por embeddings y del filtrado de la fila de totales.
- Verificación del manejo de planes extensos (textos largos) y de formatos inesperados.
- Verificación del flujo de autenticación (login, registro, logout, acceso a rutas protegidas).

## Herramientas para el Testing

### Pruebas individuales
**Descripción:** se utilizará **Postman** como herramienta complementaria para pruebas durante el desarrollo de la API: enviar solicitudes HTTP (incluida la cookie de sesión) y revisar las respuestas de forma interactiva. También se usará el navegador con DevTools para las vistas del frontend.

**Funcionalidades principales:**
- Envío de solicitudes HTTP autenticadas (cookie httpOnly) y sin autenticación.
- Visualización de respuestas JSON de forma estructurada.
- Pruebas manuales exploratorias de los flujos de la aplicación (subir PDF, explorar grafo, marcar progreso).

### Pruebas masivas
**Descripción:** se desarrollarán scripts de automatización en **Python + Requests** para ejecutar pruebas masivas sobre la API: enviar solicitudes con diferentes PDFs/datos y evaluar los resultados para detectar inconsistencias.

**Funcionalidades principales:**
- Carga automática de conjuntos de PDFs de prueba (distintas carreras y formatos).
- Envío masivo de solicitudes (login, upload, consultas de correlativas, progreso).
- Análisis automático de respuestas para detectar errores o anomalías.

## Casos de Prueba

1. **Autenticación**
   - Caso 1: **Registro con auto-login.** Crear un usuario (nickName + contraseña) y verificar que la sesión quede iniciada con una cookie httpOnly.
   - Caso 2: **Login/logout.** Iniciar sesión, validar la cookie, cerrar sesión y validar que la cookie se elimine.
   - Caso 3: **Ruta protegida sin token.** Solicitar `/careers` o `/progress` sin cookie y verificar respuesta `401`.

2. **Carga de planes de estudio**
   - Caso 4: **PDF formato SIU-Guaraní.** Subir un plan clásico y verificar que se importen las materias y sus correlatividades.
   - Caso 5: **PDF formato columnar compacto.** Subir el plan de Informática ("para comunicar"/"para web") y verificar la importación.
   - Caso 6: **Fila de totales de cierre.** Con un plan que cierre con la fila "TÍTULO: ...", verificar que **no** se importe como materia.
   - Caso 7: **Matching de correlativas por IA.** Verificar que las correlativas sugeridas por embeddings sean correctas (similitud mínima configurada) y que no aparezcan pares falsos.

3. **Rendimiento y robustez**
   - Caso 8: **Plan extenso.** Enviar un plan largo y verificar el tiempo de respuesta y que no se trunque la información.
   - Caso 9: **Formato inesperado.** Enviar un PDF sin estructura de materias y verificar que la API responda un error controlado (sin romperse).

4. **Progreso académico**
   - Caso 10: **Marcar progreso.** Actualizar el estado de una materia (Aprobada/Regular/Cursando/Pendiente) y verificar que se recalcule el desbloqueo de correlativas y los créditos acumulados.

## Plan de Ejecución

1. Configurar un entorno de prueba (backend en puerto 3000, frontend en puerto 5173, MongoDB y Redis locales).
2. Preparar los casos de prueba y los PDFs de muestra (SIU-Guaraní, columnar compacto, plan con totales, plan extenso).
3. Ejecutar cada caso de prueba sobre los endpoints y flujos relevantes.
4. Registrar los resultados en el [Documento de Seguimiento de Testing](./Test-Cases.md), incluyendo errores o comportamientos inesperados.
5. Repetir las pruebas tras cada corrección para confirmar estabilidad y consistencia.

## Plan de Pruebas Adicionales (Opcionales)

**Prueba de calidad a gran escala:** ejecutar múltiples cargas de distintos planes (varias carreras y formatos) para garantizar que la importación y el matching de correlativas mantengan un alto nivel de calidad bajo una carga significativa.