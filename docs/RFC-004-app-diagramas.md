# RFC-004 — Trazo: app web de diagramas con modelo JSON

| Campo | Valor |
|---|---|
| Estado | 🟢 Aprobado el 2026-10-11: se puede arrancar el H1 |
| Autor | Faro |
| Constructor | Juan + Claude, en el repo `trazo` (público, MIT) |
| Misión | M15 (`MISIONES.md`) |
| Fecha | 2026-10-11 |
| Fecha límite externa | Ninguna |

---

## 1. Por qué existe

Juan necesita hacer diagramas con frecuencia, en proyectos laborales y personales. Las herramientas del mercado no le gustan o son de pago. Quiere una propia, que pueda llegar a ser un producto.

Idea de fondo: el diagrama es un documento JSON con un esquema simple y estable. Hoy solo lo usa el editor, pero queda abierto para que Claude lo lea y lo escriba más adelante.

## 2. El problema

Mermaid, Excalidraw y draw.io ya son formatos de texto y Claude los escribe bien. Lo que le falta a Juan no es un formato: es un **editor que le guste**, rápido y sin pago, con un modelo propio que él controla. Si el editor no es mejor que lo que ya usa, el proyecto no se justifica. Por eso la v1 se acota a dos tipos de diagrama y se mide contra ese criterio (§6).

## 3. Requisitos

### 3.1 Funcionales
- **F1.** Dos tipos de diagrama en la v1: mapa mental y diagrama de flujo.
- **F2.** Crear, mover, editar y borrar nodos y conexiones desde el lienzo, con atajos de teclado (en un mapa mental, Tab crea un hijo y Enter crea un hermano).
- **F3.** Auto-layout: si el diagrama no trae posiciones, el editor lo ordena solo. El usuario puede mover nodos a mano después.
- **F4.** Guardado local en dos sitios: en el navegador (IndexedDB, con lista de diagramas) y como archivo `.json` en disco (abrir y guardar).
- **F5.** Exportar a SVG y PNG.
- **F6.** Deshacer y rehacer.
- **F7.** Formato del archivo: JSON con esquema versionado y validación al abrir. Un archivo inválido muestra un error claro y no rompe la app.

### 3.2 No funcionales
- **N1.** Costo cero: sitio estático, sin servidor ni cuentas.
- **N2.** Los datos nunca salen del navegador.
- **N3.** Escritorio primero. El móvil no se garantiza en la v1.
- **N4.** La escritura a disco usa la File System Access API (Chrome y Edge). En otros navegadores baja a descargar y subir archivos.
- **N5.** Repo público `trazo`, licencia MIT y README propio. Excepción a la convención `<tipo>-<dominio>-<nombre>` de `PROYECTOS.md`: lleva el nombre comercial porque es un producto (Juan, 2026-10-11).
- **N6.** **El diseño es el diferenciador** (Juan, 2026-10-11: lo que no le gusta de las herramientas actuales es su diseño). La app tiene identidad visual propia, sistema de tokens, tema claro y oscuro, y estilos de nodo cuidados. El diseño se trabaja con la skill `frontend-studio` y se revisa con capturas.

## 4. Fuera de alcance (v1)

- Servidor MCP y uso por Claude (Juan, 2026-10-11). El esquema JSON se diseña para permitirlo, pero no se construye nada.
- Cuentas, nube y sincronización entre dispositivos.
- Colaboración en tiempo real.
- Otros tipos de diagrama (secuencia, ER, arquitectura).
- Importar Mermaid (candidato a v2).
- Móvil.

## 5. Diseño propuesto

**Stack:** Vite + React + TypeScript. Lienzo con React Flow (`@xyflow/react`) y layout con `elkjs`. Persistencia con IndexedDB. Despliegue estático en GitHub Pages (ver §5.2).

### 5.1 Arquitectura

Hexagonal (puertos y adaptadores), igual que RFC-003. La razón concreta: el dominio no puede depender de React, de React Flow ni del navegador. Así el motor del lienzo se puede cambiar, y el día que haga falta un servidor MCP reutiliza el mismo núcleo en Node.

```
trazo/
├── packages/
│   └── core/                 # TypeScript puro, sin React ni DOM
│       ├── src/
│       │   ├── domain/       # Diagram, Node, Edge; operaciones puras; historial
│       │   ├── schema/       # esquema JSON versionado, validación y migraciones
│       │   ├── application/  # casos de uso: crear, editar, abrir, guardar, exportar
│       │   └── ports/        # interfaces (ver abajo)
│       └── test/             # espeja src/
└── apps/
    └── web/                  # React + Vite
        ├── src/
        │   ├── adapters/     # implementaciones de los puertos
        │   ├── ui/           # componentes, tema, tokens
        │   └── main.tsx
        └── test/
```

**Puertos** (en `core`): `DiagramRepository` (listar, cargar, guardar, borrar), `FileGateway` (abrir y guardar un archivo `.json`), `LayoutEngine` (ordena un diagrama sin posiciones) y `Exporter` (SVG, PNG).

**Adaptadores** (en `apps/web`): `IndexedDbRepository`, `FileSystemAccessGateway` con respaldo de descarga y subida, `ElkLayoutEngine`, `SvgExporter` y `PngExporter`. React Flow es un adaptador de UI: traduce el modelo del dominio a nodos y aristas del lienzo y devuelve los cambios como operaciones del dominio.

**Regla de dependencias:** `ui` → `application` → `domain`; los adaptadores implementan puertos y solo se conectan en `main.tsx`. `domain` y `schema` no importan nada fuera de sí mismos, y un lint (`eslint-plugin-boundaries`) lo hace cumplir.

**Estado:** el diagrama es un valor inmutable; cada edición es una operación pura `(diagrama, operación) → diagrama`. El historial de deshacer/rehacer guarda esos valores. Un store ligero (Zustand) conecta la UI con los casos de uso.

**Pruebas:** `core` lleva pruebas unitarias de las operaciones, el esquema y las migraciones, con rigor alto porque es lo que hay que proteger. Los adaptadores llevan pruebas de integración mínimas. La UI se revisa con capturas. Las pruebas van en `test/` espejando `src/`, no junto al código.

**Por qué dos paquetes desde el inicio:** separar `core` de `web` cuesta poco ahora y mucho después. Es lo que habilita el MCP sin reescribir.

**Esquema JSON (borrador):**

```json
{
  "version": 1,
  "type": "mindmap",
  "title": "Plan de portafolio",
  "nodes": [
    { "id": "n1", "label": "Portafolio", "parent": null },
    { "id": "n2", "label": "Contenido", "parent": "n1" }
  ],
  "edges": []
}
```

- Un mapa mental es un árbol (cada nodo tiene `parent`). Un diagrama de flujo es un grafo (`edges` con `from`, `to` y `label` opcional, y nodos con `kind`: `start`, `process`, `decision`, `end`).
- `position` y `style` son opcionales. Si faltan, manda el auto-layout.
- `version` permite migrar archivos viejos sin romperlos.

### 5.2 Despliegue en GitHub Pages (decidido por Juan, 2026-10-11)

Trazo se publica con el GitHub Pages del propio repo `trazo`. Como `juanfeds.com` es el dominio personalizado del portafolio, el sitio queda en `juanfeds.com/trazo`. Cada push a `main` dispara un workflow de GitHub Actions (despliegue continuo normal) que construye `apps/web` con `base: '/trazo/'` y lo publica.

Sin token, sin segunda Action y sin acoplar repos: la URL corta sale de llamar al repo `trazo`. Si Trazo llega a tener dominio propio, solo cambia `base`.

**Alternativas descartadas:**
- **tldraw:** es de lienzo libre. Aquí hace falta estructura de grafo con layout automático, y la licencia de producción de tldraw es de pago.
- **Mermaid como formato nativo:** limita la edición visual y el posicionamiento manual.
- **Lienzo propio en canvas/SVG desde cero:** el costo de aristas, selección y zoom no aporta nada que React Flow no resuelva.
- **Backend con base de datos:** viola N1 y N2 sin necesidad.

## 6. Evaluación

La prueba central es si Juan lo prefiere a lo que usa hoy.
- Juan arma tres diagramas reales (un mapa mental y dos flujos) con la app y con la herramienta que usaba antes. Compara tiempo y comodidad.
- Un diagrama de 50 nodos se ordena, se mueve y se exporta sin lag perceptible.
- Un archivo guardado en la v1 se abre sin cambios cuando exista la v2 (prueba de migración con el campo `version`).

## 7. Hitos

- **H1.** Repo con `core` y `web`, tokens de diseño, Vite + React + React Flow y un diagrama de flujo editable en memoria.
- **H2.** Mapa mental con atajos de teclado y auto-layout con elkjs.
- **H3.** Persistencia: IndexedDB, abrir y guardar `.json`, esquema validado.
- **H4.** Exportar SVG y PNG, deshacer/rehacer, publicación automática en GitHub Pages (§5.2) y README.

## 8. Criterios de aceptación (con esto revisa Faro)

1. El sitio está desplegado en `juanfeds.com/trazo` y funciona sin cuenta ni servidor.
2. Se puede crear, editar y borrar un mapa mental y un diagrama de flujo solo desde el lienzo.
3. Un diagrama sin posiciones queda ordenado automáticamente al abrirlo.
4. Un diagrama guardado en el navegador sobrevive a cerrar y reabrir la pestaña.
5. Un archivo `.json` guardado en disco se abre en la app y reproduce el mismo diagrama.
6. Un archivo inválido muestra un error claro y no rompe la app.
7. Se exporta a SVG y PNG.
8. El esquema JSON está documentado en el README y tiene campo `version`.
9. La prueba de §6 está hecha y su resultado queda anotado en el repo.
10. El repo es público, con README, licencia MIT y el nombre `trazo`.
11. `core` no importa React, React Flow ni el DOM, y el lint de fronteras pasa.
12. `core` tiene pruebas unitarias de operaciones, esquema y migraciones, en `test/` espejando `src/`.
13. La app tiene tema claro y oscuro y tokens de diseño definidos, y Juan la aprueba visualmente con capturas (N6).

## 9. Preguntas abiertas

Resueltas el 2026-10-11: nombre del repo `trazo` (excepción a la convención: es el nombre comercial), nombre comercial **Trazo** (libre en npm; dominio propio descartado), licencia MIT, hosting en GitHub Pages bajo el dominio personal `juanfeds.com`, diferenciador = diseño (N6), separación en `core` y `web` aceptada, URL pública `juanfeds.com/trazo` (§5.2).

*(Sin preguntas abiertas.)*
