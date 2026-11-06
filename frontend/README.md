# Frontend - Proyecto Integrador UNAHUR

Aplicación web hecha con React + Vite + TypeScript. Consume la API del backend para cargar planes de estudio y visualizar correlatividades y progreso.

## Requisitos

- Node.js 22+

## Instalación y ejecución

```bash
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build

# Lint
npm run lint

# Pruebas unitarias
npm run test:faq
npm run test:status
npm run test:graph
npm run test:layout
npm run test:subjects
```

> Variable opcional: `VITE_API_URL` (por defecto `http://localhost:3000`), apunta al backend. No hay un `.env.Ejemplo` propio del frontend; si necesitás cambiar la URL, creá `.env` con esa variable.

> Los tests cubren búsqueda FAQ, estados de progreso, resaltado del grafo, trazado de aristas y nombre visible por plan (`nameOverride`).

## Estructura

```
src/
├── api/           # Cliente HTTP y llamadas al backend (client.ts + por recurso)
├── assets/        # Iconos y recursos gráficos
├── components/    # Componentes reutilizables (Sidebar, Footer, ...)
├── context/       # Contextos (ThemeContext, CareerContext, ...)
├── data/          # Datos estáticos de la aplicación
├── hooks/         # Custom hooks
├── layouts/       # Layouts compartidos
├── pages/         # Páginas / rutas de la aplicación
├── styles/        # Estilos compartidos y responsive
├── types/         # Tipos TypeScript
├── utils/         # Funciones auxiliares
├── App.tsx        # Rutas y proveedores
└── main.tsx       # Punto de entrada (monta Bootstrap + App)
```

## Tecnologías

- React 19 + TypeScript
- Vite
- React Router DOM v7
- Bootstrap 5 + React Bootstrap

## Reglas de estilo

- Cada entidad del backend tiene su módulo en `src/api/` (ej: `careers.ts`) y se unifica en `src/api/index.ts` como `apiService`.
- Las páginas viven en `src/pages/`, los componentes reutilizables en `src/components/`.
- Estado global con Context (ThemeContext para tema, CareerContext para la carrera activa, etc.).