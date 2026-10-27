# Arquitectura de Gradify

Gradify es una aplicación web para cargar planes de estudio desde PDF, explorar
correlatividades y seguir el avance académico. El repositorio separa la API
(`backend/`) de la aplicación web (`frontend/`).

## Vista general

```
Navegador (React + Vite)
        │  HTTP/JSON + JWT
        ▼
Express (backend)
        │
        ├── MongoDB (Mongoose)   datos de catálogo, planes, progreso
        ├── Redis (opcional)     caché y rate limit; si no está, la app sigue
        └── IA (opcional)        respaldo de extracción cuando el parser no alcanza
```

## Backend

### Capas y regla de dependencia

```
routes → controllers → services → models
                 ↘ middlewares / utils
```

- **`routes/`**: solo declara método, path, middlewares y controlador. No tiene
  lógica de negocio.
- **`controllers/`**: traduce HTTP a llamadas de servicio y arma la respuesta.
  No importa modelos Mongoose: la persistencia queda encapsulada en servicios.
- **`services/`**: lógica de negocio y acceso a datos. Es la única capa que
  conoce los modelos.
- **`models/`**: esquemas Mongoose y constantes de dominio (por ejemplo
  `SUBJECT_STATUS`).
- **`middlewares/`**: autenticación, autorización, validación y subida de
  archivos.
- **`utils/`**: helpers sin estado (`AppError`, normalizadores).

### Flujo de una importación de plan

1. `POST /plan-imports/preview` (ADMIN) recibe el PDF con `multer`.
2. `planImport.controllers.js` delega en `planExtraction.strategy.js`.
3. La estrategia intenta primero el parser determinístico a través de la
   fachada `pdfParser.service.js`.
4. Si el parser no detecta materias, se usa el respaldo de IA
   (`aiExtract.service.js`) y se cachea el resultado por hash del archivo.
5. `POST /plan-imports/confirm` llama a
   `planImportConfirmationService.js`, que crea `StudyPlan`, `PlanSubject` y
   resuelve correlativas con `correlativas.service.js`.
6. Ante un error a mitad de la escritura, el servicio limpia lo creado porque
   MongoDB standalone no habilita transacciones.

### Parser de PDFs

La fachada `src/services/pdfParser.service.js` mantiene la API pública:

```js
const {
  parseOfficialPlan,
  parseAcademicHistory,
  parseCorrelativas,
  extractLines,
} = require("./services/pdfParser.service");
```

La implementación vive en `src/services/pdf/` y se separa por tipo de documento:

| Archivo               | Responsabilidad                                              |
| --------------------- | ------------------------------------------------------------ |
| `raw.js`              | Carga `pdfjs-dist` y extrae ítems con coordenadas.           |
| `shared.js`           | Helpers de texto, filas, períodos y nombres compartidos.     |
| `officialPlan.js`     | Plan oficial: tabla de estructura, horas, créditos e intermedio. |
| `academicHistory.js`  | Historia académica / plan personal con estado y nota.        |
| `correlativas.js`     | Planes de correlatividades (tres columnas, anexo y dos columnas). |

Reglas para tocarlo:

- Los cambios deben conservar la salida exacta: el gate
  `npm run snapshot:planes -- --check` compara contra `docs/testing/golden/` y
  debe dar **cero diferencias**.
- Un helper que usan dos parsers va en `shared.js`; uno específico se queda en
  su módulo.
- La fachada no debe crecer con funciones internas: los consumidores importan
  solo las cuatro funciones públicas.

### Modelo de datos principal

```
University → AcademicUnit → Career → StudyPlan → PlanSubject
                                              ↘ prerequisites (PlanSubject)
Usuario → UserStudyPlan → SubjectProgress
PlanImport (auditoría de cada preview/confirm)
```

- `PlanSubject` guarda la materia dentro de un plan y sus correlativas
  (`requiredStatus`: regularizada o aprobada).
- `SubjectProgress` guarda el estado del usuario por materia de un plan.
- `UserStudyPlan` vincula usuario y plan; permite baja reversible sin perder
  avance.

### Autenticación y permisos

- JWT en `Authorization: Bearer` y, además, cookie `httpOnly`.
- Catálogo e importaciones: solo `ADMIN`.
- Planes: dueño o `ADMIN` para mutar; cualquier usuario autenticado para leer
  cuando corresponde (`authStudyPlanViewer`).
- `logout` incrementa `tokenVersion`, lo que invalida los JWT emitidos antes.

### Errores

Las respuestas de error usan el formato:

```json
{ "success": false, "error": { "message": "...", "details": [] } }
```

El `errorHandler` central traduce `AppError` y errores de validación a códigos
HTTP coherentes (400, 401, 403, 404, 409, 422, 500).

## Frontend

```
src/
├── api/          cliente HTTP y adaptadores por recurso
├── components/   componentes reutilizables
├── context/      tema y carrera activa
├── hooks/        lógica reutilizable
├── pages/        rutas de la aplicación
├── styles/       CSS global centralizado (ver docs/CSS.md)
├── types/        tipos compartidos
├── App.tsx       rutas y proveedores
└── main.tsx      punto de entrada
```

- Las páginas no llaman `fetch` directo: usan `src/api/`.
- El estado global se limita a tema y carrera activa; el resto es estado local.
- El grafo de correlatividades se arma en el cliente a partir del plan y del
  progreso (`planGraphAdapter.ts`).

## Pruebas

| Comando                              | Qué cubre                                                   |
| ------------------------------------ | ----------------------------------------------------------- |
| `npm test` (backend)                 | Unitarios con `node:test` (45 tests).                       |
| `npm run test:jest` (backend)        | Esquemas y validaciones con Jest (24 tests).                |
| `npm run lint` (backend)             | ESLint sobre `src/`, `tests/`, `tests-jest/` y `scripts/`.  |
| `npm run test:cobertura`             | Todo PDF del corpus está en la referencia o excluido.       |
| `npm run snapshot:planes -- --check` | El parser no cambió su salida (golden, cero diff).          |
| `npm run test:institutos`            | Un plan y su correlativa por instituto, por HTTP real.      |
| `npm run test:salud`                 | Extracción de correlativas de Salud + controles negativos.  |
| `npm run test:planes`                | Carga E2E de los 43 PDFs de referencia contra la API real.  |
| `npm run lint` / `npm run build` (frontend) | ESLint y build de producción.                        |
| `npm run test:order` / `npm run test:contrast` (frontend) | Orden y contraste del CSS.        |

Los scripts E2E crean un usuario temporal, lo usan con JWT y lo eliminan al
final. Requieren la API levantada y el corpus `files/UNAHUR-Oferta-Academica`.

## Convenciones

- Nombres de archivo: `recurso.controllers.js`, `recurso.routes.js`; modelos en
  minúscula singular (`career.js`); servicios en camelCase (`careerService.js`).
- Mensajes de usuario y errores en español.
- Un cambio de comportamiento se acompaña con test y con la entrada
  correspondiente en `CHANGELOG.md`.
