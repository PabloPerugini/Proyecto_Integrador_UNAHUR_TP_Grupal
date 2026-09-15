# Frontend - Proyecto Integrador UNAHUR

Aplicación web hecha con React + Vite + TypeScript. La estructura replica el formato del TP de Construcción de Interfaces de Usuario.

## Requisitos

- Node.js 18+

## Instalación y ejecución

```bash
npm install
cp .env.Ejemplo .env   # (o crear .env con VITE_API_URL)

# Desarrollo
npm run dev

# Build de producción
npm run build

# Lint
npm run lint
```

> Variable de entorno: `VITE_API_URL` (por defecto `http://localhost:3000`), apunta al backend.

## Estructura

```
src/
├── api/           # Cliente HTTP y llamadas al backend (client.ts + por recurso)
├── components/    # Componentes reutilizables (NavBar, Footer, ProtectedRoute, ...)
├── context/       # Contextos (AuthContext, ThemeContext, ...)
├── hooks/         # Custom hooks
├── pages/         # Páginas / rutas de la aplicación
├── types/         # Tipos TypeScript
├── App.tsx        # Rutas y proveedores
├── main.tsx       # Punto de entrada (monta Bootstrap + App)
├── App.css
└── index.css
```

## Tecnologías

- React 19 + TypeScript
- Vite
- React Router DOM v7
- Bootstrap 5 + React Bootstrap

## Reglas de estilo

- Cada entidad del backend tiene su módulo en `src/api/` (ej: `users.ts`) y se unifica en `src/api/index.ts` como `apiService`.
- Las páginas viven en `src/pages/`, los componentes reutilizables en `src/components/`.
- Estado global con Context (AuthContext para sesión, ThemeContext para tema, etc.).