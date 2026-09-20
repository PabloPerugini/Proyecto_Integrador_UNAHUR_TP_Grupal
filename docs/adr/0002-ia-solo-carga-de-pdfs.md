# ADR-0002 — IA utilizada en la carga de PDFs (matching semántico local)

- **Fecha:** 2026-09-20
- **Estado:** Aceptada (parcial) — chat IA planeado sin implementar
- **Decisores:** Pablo

## Contexto

Al subir el PDF de un plan de estudios, se desea detectar automáticamente las correlativas de
cada materia. Se evaluó hacerlo por heurísticas de texto (nombres/id) versus usar IA.

## Decisión

- La IA colabora **solo en la carga de PDFs**: embeddings locales (`@xenova/transformers`) para
  **matching semántico de correlativas**. Corre en el navegador, sin API externa ni claves.
- El **chat del orientador** (US-04) queda como **endpoint backend disponible**
  (`POST /careers/:id/chat`), con la UI **planeada** (SC002). Requerirá un proveedor
  (GROQ/GEMINI/OLLAMA) y sus claves, por eso no está activo por defecto.

## Consecuencias

- **Positivas:** cero fricción de setup (sin API keys para lo que ya funciona); privacidad de
  los PDFs (procesamiento local); demo sin costo.
- **Negativas:** la capacidad de IA está acotada a la carga; el chat de preguntas/plan
  personalizado aún no está disponible para el usuario final.
- Registrado en BRD/FRD v1.2 (dependencias IA §2.6, SC002, US-04 planeada).