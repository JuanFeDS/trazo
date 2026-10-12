# Trazo

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square" />
  <img alt="TypeScript 5.9" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square" />
  <img alt="Vite 7" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&style=flat-square" />
  <img alt="React Flow 12" src="https://img.shields.io/badge/React_Flow-12-FF0072?logo=react&logoColor=white&style=flat-square" />
  <img alt="Zustand 5" src="https://img.shields.io/badge/Zustand-5-443E38?logo=react&logoColor=white&style=flat-square" />
  <img alt="Vitest 3" src="https://img.shields.io/badge/Vitest-3-6E9F18?logo=vitest&logoColor=white&style=flat-square" />
  <img alt="Licencia MIT" src="https://img.shields.io/badge/Licencia-MIT-yellow?style=flat-square" />
</p>

Trazo es una app web para hacer diagramas: mapas mentales y diagramas de flujo. Un diagrama es un documento JSON con un esquema simple y versionado; el editor trabaja directamente sobre ese modelo. Es un sitio estático: funciona sin servidor ni cuentas y los datos nunca salen del navegador.

---

## Tabla de contenido

1. [Contexto y motivación](#-contexto-y-motivación)
2. [Funcionalidades](#-funcionalidades)
3. [Roadmap](#-roadmap)
4. [Arquitectura](#-arquitectura)
5. [Esquema del archivo JSON](#-esquema-del-archivo-json)
6. [Guía de uso](#-guía-de-uso)
7. [Contacto](#-contacto)

---

## 🎯 Contexto y motivación

Mermaid, Excalidraw y draw.io ya son formatos de texto. Lo que faltaba no era un formato, sino un **editor que guste**: rápido, sin pago y con un modelo propio que se controla. Por eso el diseño es el diferenciador: identidad visual propia, sistema de tokens y tema claro y oscuro. El esquema JSON queda abierto para que, más adelante, otras herramientas (por ejemplo un servidor MCP) lo lean y lo escriban.

---

## ✨ Funcionalidades

| | Funcionalidad |
|---|---|
| 🧭 | **Dos tipos de diagrama:** diagrama de flujo (inicio, proceso, decisión, fin) y mapa mental con estructura central |
| ⌨️ | **Edición desde el lienzo con atajos:** en un mapa mental, Tab crea un hijo y Enter un hermano |
| 🪄 | **Auto-layout** con elkjs: si un nodo no tiene posición, el editor lo ordena; lo que mueves a mano se respeta y "Reordenar" lo descarta |
| 🔀 | **Flechas ajustables:** arrastra sus extremos o elige el lado por el que salen y entran |
| 💾 | **Guardado local doble:** autoguardado en IndexedDB con lista de diagramas, y archivos `.json` en disco (File System Access API en Chrome y Edge; subida y descarga en otros navegadores) |
| 🛡️ | **Esquema versionado y validado:** un archivo inválido muestra un error claro y no rompe la app |
| 🖼️ | **Exportar** a SVG y PNG con las fuentes embebidas |
| ↩️ | **Deshacer y rehacer** |
| 🌗 | **Tema claro y oscuro** |

**Fuera de alcance de la v1:** servidor MCP, cuentas y nube, colaboración en tiempo real, otros tipos de diagrama (secuencia, ER, arquitectura), importar Mermaid y móvil.

---

## 🗺️ Roadmap

| Hito | Contenido | Estado |
|---|---|---|
| H1 | Monorepo `core` + `web`, tokens de diseño, diagrama de flujo editable | ✅ |
| H2 | Mapa mental con atajos y auto-layout con elkjs | ✅ |
| H3 | Persistencia: IndexedDB, abrir y guardar `.json`, esquema validado | ✅ |
| H4 | Exportar SVG y PNG, deshacer/rehacer, despliegue en GitHub Pages y README | ✅ |

La especificación completa está en [`docs/RFC-004-app-diagramas.md`](docs/RFC-004-app-diagramas.md).

---

## 🏛️ Arquitectura

Hexagonal (puertos y adaptadores): el dominio no depende de React, de React Flow ni del navegador. Así se puede cambiar el motor del lienzo y reutilizar el mismo núcleo en Node.

```
trazo/
├── packages/
│   └── core/                 # TypeScript puro, sin React ni DOM
│       ├── src/
│       │   ├── domain/       # diagramas, operaciones puras, historial
│       │   ├── schema/       # validación, migraciones y serialización
│       │   ├── application/  # casos de uso: guardar, abrir, listar
│       │   └── ports/        # interfaces: repositorio, archivos, layout, exportador
│       └── test/             # espeja src/
└── apps/
    └── web/                  # React + Vite
        ├── src/
        │   ├── adapters/     # IndexedDB, archivos, elkjs, exportadores SVG/PNG
        │   ├── state/        # store de Zustand
        │   ├── ui/           # componentes, tema, tokens
        │   └── main.tsx      # único punto donde se conectan los adaptadores
        └── test/
```

**Regla de dependencias:** `ui` → `application` → `domain`; los adaptadores implementan puertos y solo se conectan en `main.tsx`. Un lint (`eslint-plugin-boundaries`) la hace cumplir, y `core` tampoco puede importar React, React Flow ni APIs del navegador.

**Estado:** el diagrama es un valor inmutable y cada edición es una operación pura `(diagrama, operación) → diagrama`. El historial de deshacer y rehacer guarda esos valores.

---

## 📐 Esquema del archivo JSON

Todo diagrama lleva `version` (entero), `type` y `title`. Las posiciones (`position`) son opcionales: si faltan, manda el auto-layout. Los campos desconocidos se descartan al abrir.

**Diagrama de flujo** (`"type": "flowchart"`):

```json
{
  "version": 1,
  "type": "flowchart",
  "title": "Inicio de sesión",
  "nodes": [
    { "id": "start", "kind": "start", "label": "Abrir la app", "position": { "x": 240, "y": 0 } },
    { "id": "valid", "kind": "decision", "label": "¿Credenciales válidas?" }
  ],
  "edges": [
    { "id": "e1", "from": "start", "to": "valid", "label": "Sí", "fromSide": "bottom", "toSide": "top" }
  ]
}
```

- `kind`: `start`, `process`, `decision` o `end`.
- `edges`: `from` y `to` deben ser ids de nodos existentes; `label`, `fromSide` y `toSide` (`top`, `right`, `bottom`, `left`) son opcionales.

**Mapa mental** (`"type": "mindmap"`):

```json
{
  "version": 1,
  "type": "mindmap",
  "title": "Plan de portafolio",
  "nodes": [
    { "id": "root", "label": "Portafolio", "parent": null },
    { "id": "content", "label": "Contenido", "parent": "root" }
  ]
}
```

- Es un árbol: exactamente un nodo con `parent: null` (la raíz), y cada otro nodo apunta al id de su padre. No se admiten ciclos.

**Versiones:** un archivo de una versión anterior se migra al abrirlo; uno de una versión más nueva que la app se rechaza con un mensaje que lo explica. Los ids de nodos y conexiones deben ser únicos.

---

## ⚙️ Guía de uso

### Requisitos

- Node.js 22
- npm (el repositorio usa workspaces)

### Instalación

Desde la raíz del repositorio:

```bash
npm install
```

### Ejecutar

```bash
npm run dev
```

Abre `http://localhost:5173/trazo/` (la app se sirve bajo `/trazo/`).

### Otros comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Comprueba tipos y genera `apps/web/dist` |
| `npm test` | Pruebas de `core` y de los adaptadores (Vitest) |
| `npm run typecheck` | Comprueba tipos en todos los paquetes |
| `npm run lint` | ESLint, incluido el lint de fronteras de arquitectura |

### Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl` + `Z` | Deshacer |
| `Ctrl` + `Mayús` + `Z` o `Ctrl` + `Y` | Rehacer |
| `Ctrl` + `S` | Guardar como archivo `.json` |
| `Ctrl` + `O` | Abrir un archivo `.json` |
| Doble clic | Editar la etiqueta de un nodo o de una conexión |
| `Supr` | Borrar lo seleccionado |
| `Tab` (mapa mental) | Crear un hijo del nodo seleccionado |
| `Enter` (mapa mental) | Crear un hermano |
| `F2` (mapa mental) | Editar el nodo seleccionado |

### Despliegue

Cada push a `main` ejecuta el workflow de [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): lint, tipos, pruebas, build y publicación en GitHub Pages. El sitio se construye con `base: '/trazo/'` y su URL objetivo es `juanfeds.com/trazo`.

---

## 📬 Contacto

JuanFe — [jmartinezbernal02@gmail.com](mailto:jmartinezbernal02@gmail.com)

---

Licencia [MIT](LICENSE).
