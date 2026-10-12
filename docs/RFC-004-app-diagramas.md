# RFC-004 — Trazo: app web de diagramas con modelo JSON

| Campo | Valor |
|---|---|
| Estado | 🟢 Aprobado el 2026-10-11: se puede arrancar el H1 |
| Autor | Faro |
| Constructor | Juan + Claude, en el repo `trazo` (público, MIT) |
| Misión | M15 (`MISIONES.md`) |
| Fecha | 2026-10-11 (actualizado con la realidad construida el 2026-10-12, ver sección 11) |
| Fecha límite externa | Ninguna |

---

## 1. Por qué existe

Juan necesita hacer diagramas con frecuencia, en proyectos laborales y personales. Las herramientas del mercado no le gustan o son de pago. Quiere una propia, que pueda llegar a ser un producto.

Idea de fondo: el diagrama es un documento JSON con un esquema simple y estable. Hoy solo lo usa el editor, pero queda abierto para que Claude lo lea y lo escriba más adelante.

## 2. El problema

Mermaid, Excalidraw y draw.io ya son formatos de texto y Claude los escribe bien. Lo que le falta a Juan no es un formato: es un **editor que le guste**, rápido y sin pago, con un modelo propio que él controla. Si el editor no es mejor que lo que ya usa, el proyecto no se justifica. Por eso la v1 se acota a dos tipos de diagrama y se mide contra ese criterio (sección 6).

## 3. Requisitos

### 3.1 Funcionales
- **F1.** Dos tipos de diagrama en la v1: mapa mental y diagrama de flujo.
- **F2.** Crear, mover, editar y borrar nodos y conexiones desde el lienzo, con atajos de teclado (en un mapa mental, Tab crea un hijo, Enter un hermano y F2 edita). *Ampliado en la construcción:* en un diagrama de flujo, el lado por el que sale y entra cada flecha se puede elegir y sus extremos se pueden reconectar; en un mapa mental, cada rama de primer nivel sale hacia la izquierda, la derecha, arriba o abajo de la raíz (`Alt` + flechas).
- **F3.** Auto-layout: si el diagrama no trae posiciones, el editor lo ordena solo. El usuario puede mover nodos a mano después, y el botón "Reordenar" descarta las posiciones manuales.
- **F4.** Guardado local en dos sitios: en el navegador (IndexedDB, con lista de diagramas) y como archivo `.json` en disco (abrir y guardar).
- **F5.** Exportar a SVG y PNG, con las fuentes embebidas. *Ampliado en la construcción:* también a JSON.
- **F6.** Deshacer y rehacer (`Ctrl` + `Z`, `Ctrl` + `Mayús` + `Z` o `Ctrl` + `Y`). Guardar y abrir archivos con `Ctrl` + `S` y `Ctrl` + `O`.
- **F7.** Formato del archivo: JSON con esquema versionado y validación al abrir. Un archivo inválido muestra un error claro y no rompe la app.

### 3.2 No funcionales
- **N1.** Costo cero: sitio estático, sin servidor ni cuentas.
- **N2.** Los datos nunca salen del navegador.
- **N3.** Escritorio primero. El móvil no se garantiza en la v1, aunque el editor se ajustó para que sea usable en pantallas angostas.
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

**Stack:** Vite + React + TypeScript. Lienzo con React Flow (`@xyflow/react`) y layout con `elkjs`. Persistencia con IndexedDB. Despliegue estático en GitHub Pages (ver sección 5.2).

### 5.1 Arquitectura

Hexagonal (puertos y adaptadores), igual que RFC-003. La razón concreta: el dominio no puede depender de React, de React Flow ni del navegador. Así el motor del lienzo se puede cambiar, y el día que haga falta un servidor MCP reutiliza el mismo núcleo en Node.

```
trazo/
├── packages/
│   └── core/                 # TypeScript puro, sin React ni DOM
│       ├── src/
│       │   ├── domain/       # diagramas, operaciones puras, historial
│       │   ├── schema/       # esquema JSON versionado, validación y migraciones
│       │   ├── application/  # casos de uso: guardar, abrir, listar
│       │   ├── ports/        # interfaces (ver abajo)
│       │   └── api/          # API pública del paquete (`@trazo/core`)
│       └── test/             # espeja src/
└── apps/
    └── web/                  # React + Vite
        ├── src/
        │   ├── adapters/     # implementaciones de los puertos
        │   ├── state/        # store de Zustand
        │   ├── ui/           # componentes, tema, tokens
        │   ├── shared/       # geometría y tamaños de nodo, usados por la UI y los adaptadores
        │   └── app/          # main.tsx: único punto donde se conectan los adaptadores
        └── test/
```

**Puertos** (en `core`): `DiagramRepository` (listar, cargar, guardar, borrar), `FileGateway` (abrir y guardar un archivo `.json`), `LayoutEngine` (ordena un diagrama sin posiciones) y `Exporter` (SVG, PNG, JSON).

**Adaptadores** (en `apps/web`): `IndexedDbRepository`, `FileSystemAccessGateway` con respaldo de descarga y subida, `ElkLayoutEngine`, `SvgExporter`, `PngExporter` y `JsonExporter`. React Flow es un adaptador de UI: traduce el modelo del dominio a nodos y aristas del lienzo y devuelve los cambios como operaciones del dominio.

**Regla de dependencias:** `ui` → `application` → `domain`; los adaptadores implementan puertos y solo se conectan en `app/main.tsx`. `domain` y `schema` no importan nada fuera de sí mismos, la web consume el núcleo solo por su API pública y un lint (`eslint-plugin-boundaries`) lo hace cumplir. Ese lint clasifica carpetas, no archivos sueltos, por eso la API del núcleo y los módulos compartidos de la web viven en carpetas (`api/`, `shared/`, `app/`).

**Estado:** el diagrama es un valor inmutable; cada edición es una operación pura `(diagrama, operación) → diagrama`. El historial de deshacer/rehacer guarda esos valores. Un store ligero (Zustand) conecta la UI con los casos de uso.

**Pruebas:** `core` lleva pruebas unitarias de las operaciones, el esquema y las migraciones, con rigor alto porque es lo que hay que proteger. Los adaptadores llevan pruebas de integración mínimas. La UI se revisa con capturas. Las pruebas van en `test/` espejando `src/`, no junto al código.

**Por qué dos paquetes desde el inicio:** separar `core` de `web` cuesta poco ahora y mucho después. Es lo que habilita el MCP sin reescribir.

**Esquema JSON (versión 1, tal como quedó implementado):**

```json
{
  "version": 1,
  "type": "mindmap",
  "title": "Plan de portafolio",
  "nodes": [
    { "id": "n1", "label": "Portafolio", "parent": null },
    { "id": "n2", "label": "Contenido", "parent": "n1", "side": "right" }
  ]
}
```

- **Mapa mental:** un árbol con exactamente una raíz (`parent: null`) y sin ciclos. No lleva `edges`. `side` (`left`, `right`, `top`, `bottom`) es opcional y solo cuenta en las ramas de primer nivel; cada rama arrastra a sus descendientes. Si falta, las ramas se alternan derecha e izquierda.
- **Diagrama de flujo:** un grafo. Los nodos llevan `kind` (`start`, `process`, `decision`, `end`) y las conexiones `from` y `to` (ids de nodos existentes), con `label`, `fromSide` y `toSide` (`top`, `right`, `bottom`, `left`) opcionales.
- `position` es opcional en cualquier nodo: si falta, manda el auto-layout. El borrador del RFC preveía también un `style` opcional; no se implementó. Los campos desconocidos se descartan al abrir.
- `version` (entero) permite migrar archivos viejos; uno de una versión más nueva que la app se rechaza con un mensaje claro. Los ids de nodos y conexiones deben ser únicos.
- La referencia del esquema vive en el README del repo.

### 5.2 Despliegue en GitHub Pages (decidido por Juan, 2026-10-11)

Trazo se publica con el GitHub Pages del propio repo `trazo`. Como `juanfeds.com` es el dominio personalizado del portafolio, el sitio queda en `juanfeds.com/trazo`. Cada push a `main` dispara un workflow de GitHub Actions (despliegue continuo normal) que corre lint, tipos y pruebas, construye `apps/web` con `base: '/trazo/'` y lo publica.

**Flujo de ramas (agregado en la construcción):** se trabaja sobre `develop` con ramas de funcionalidad y PR; un workflow de CI (lint, tipos, pruebas y build) corre en cada PR y en `develop`, y `main` recibe PR de `develop` y es lo que se publica.

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

- ✅ **H1.** Repo con `core` y `web`, tokens de diseño, Vite + React + React Flow y un diagrama de flujo editable en memoria.
- ✅ **H2.** Mapa mental con atajos de teclado y auto-layout con elkjs.
- ✅ **H3.** Persistencia: IndexedDB, abrir y guardar `.json`, esquema validado.
- ✅ **H4.** Exportar SVG y PNG, deshacer/rehacer, publicación automática en GitHub Pages (sección 5.2) y README.

Los cuatro hitos se construyeron el 2026-10-11. Los criterios de aceptación y la prueba de sección 6 siguen pendientes de cierre (ver sección 10).

## 8. Criterios de aceptación (con esto revisa Faro)

1. El sitio está desplegado en `juanfeds.com/trazo` y funciona sin cuenta ni servidor.
2. Se puede crear, editar y borrar un mapa mental y un diagrama de flujo solo desde el lienzo.
3. Un diagrama sin posiciones queda ordenado automáticamente al abrirlo.
4. Un diagrama guardado en el navegador sobrevive a cerrar y reabrir la pestaña.
5. Un archivo `.json` guardado en disco se abre en la app y reproduce el mismo diagrama.
6. Un archivo inválido muestra un error claro y no rompe la app.
7. Se exporta a SVG y PNG.
8. El esquema JSON está documentado en el README y tiene campo `version`.
9. La prueba de sección 6 está hecha y su resultado queda anotado en el repo.
10. El repo es público, con README, licencia MIT y el nombre `trazo`.
11. `core` no importa React, React Flow ni el DOM, y el lint de fronteras pasa.
12. `core` tiene pruebas unitarias de operaciones, esquema y migraciones, en `test/` espejando `src/`.
13. La app tiene tema claro y oscuro y tokens de diseño definidos, y Juan la aprueba visualmente con capturas (N6).

## 9. Preguntas abiertas

Resueltas el 2026-10-11: nombre del repo `trazo` (excepción a la convención: es el nombre comercial), nombre comercial **Trazo** (libre en npm; dominio propio descartado), licencia MIT, hosting en GitHub Pages bajo el dominio personal `juanfeds.com`, diferenciador = diseño (N6), separación en `core` y `web` aceptada, URL pública `juanfeds.com/trazo` (sección 5.2).

*(Sin preguntas abiertas.)*

## 10. Revisión

### 2026-10-12 — Faro, sobre el artefacto real (repo `trazo` en `40c0ea0`, sitio en vivo)

Los cuatro hitos se construyeron el 2026-10-11, en 30 commits directos sobre `main`. Verificado: 82 pruebas pasan (67 de `core`, 15 de `web`), `lint`, `typecheck` y `build` en verde, y el sitio responde en `juanfeds.com/trazo` con el workflow de Pages en verde.

| # | Criterio | Veredicto | Evidencia / qué falta |
|---|---|---|---|
| 1 | Desplegado en `juanfeds.com/trazo`, sin cuenta ni servidor | ✅ Cumple | Responde 200; se probó en el navegador. |
| 2 | Crear, editar y borrar mapa mental y flujo desde el lienzo | 🟡 Parcial | El flujo se ve y se edita en vivo; las operaciones del mapa mental tienen 16 pruebas en `core`. Falta que Juan lo pruebe a mano. |
| 3 | Un diagrama sin posiciones se ordena solo | ✅ Cumple | Adaptador `ElkLayoutEngine` y botón "Reordenar". |
| 4 | Lo guardado en el navegador sobrevive a cerrar la pestaña | ✅ Cumple | `IndexedDbRepository` con 6 pruebas de integración y autoguardado visible. |
| 5 | Un `.json` guardado en disco se reabre igual | 🟡 Parcial | Casos de uso de abrir y guardar probados en `core`; falta la prueba de ida y vuelta en la app. |
| 6 | Un archivo inválido muestra un error claro sin romper | 🟡 Parcial | 19 pruebas de validación y aviso `NoticeBanner` con `role="alert"`; falta verlo en vivo. |
| 7 | Exporta SVG y PNG | ✅ Cumple | Exportadores y 9 pruebas de la escena exportada. |
| 8 | Esquema documentado en el README, con `version` | ✅ Cumple | Sección "Esquema del archivo JSON". |
| 9 | Prueba de sección 6 hecha y anotada en el repo | ❌ No cumple | No está hecha: ni los tres diagramas reales comparados con la herramienta anterior ni la prueba de 50 nodos. |
| 10 | Repo público, README, MIT, nombre `trazo` | ✅ Cumple | |
| 11 | `core` sin React, React Flow ni DOM; lint de fronteras pasa | ✅ Cumple, con una advertencia | Ningún import prohibido. Pero `eslint-plugin-boundaries` avisa que tres patrones son de archivo y no de carpeta (`core/src/index.ts`, `web/src/{geometry,nodeSizes}.ts`, `web/src/main.tsx`): esos archivos pueden quedar fuera de la regla. |
| 12 | Pruebas de `core` (operaciones, esquema, migraciones) en `test/` espejando `src/` | ✅ Cumple | 6 archivos en `test/{application,domain,schema}`; la validación cubre migraciones. |
| 13 | Tema claro y oscuro, tokens y aprobación visual de Juan | 🟡 Parcial | `tokens.css`, `useTheme` y botón de tema existen. Falta la aprobación de Juan con capturas (N6). |

**Veredicto: aún no se acepta.** La v1 está funcionalmente construida, pero falta lo que la valida como producto: la evaluación de sección 6 (criterio 9), la aprobación visual (13) y probar a mano los flujos 2, 5 y 6.

**Observaciones de proceso:**
- Se trabajó directo sobre `main`, sin ramas ni PR, aunque el paso 3 del flujo RFC → construcción → revisión lo pide. Por ser un producto público conviene retomar las ramas desde la v1.1.
- Hay trabajo sin commit (13 archivos, unas 310 líneas): dirección de las ramas del mapa mental (campo opcional `side` en el esquema, atajo `Alt` + flechas) y ajustes del layout del flujo. Es una mejora fuera del alcance original de la v1; si se queda, conviene anotarla en el README como ya está hecho y commitearla.
- En un panel angosto (~800 px), el título del diagrama en la barra se corta ("Ini…") y la ayuda de atajos de la barra inferior queda apretada. La v1 es "escritorio primero" (N3), así que no bloquea, pero toca al revisar el diseño (13).

### 2026-10-12, segunda pasada — Faro, sobre `develop` en `6c05b69` y las pruebas manuales de Juan

Desde la primera revisión llegó trabajo por ramas y PR (`feature/mindmap-branch-directions`, `feature/ci-on-pull-requests`): ramas del mapa mental en cuatro direcciones, exportación a JSON y CI en pull requests. Verificado de nuevo en local: `typecheck`, `lint`, `build` en verde y 85 pruebas pasan (67 de `core`, 18 de `web`).

**Cambios frente a la primera pasada:**
- **3, 5 y 6 pasan de parcial o por confirmar a ✅.** Juan abrió en la app los diagramas de prueba de `trazo/fixtures/diagramas/` (cuatro válidos, con y sin posiciones, y cinco inválidos) y todos se comportaron como se esperaba.
- **11 queda ✅ sin advertencia.** El commit `7e1a136` clasificó la API del núcleo y las carpetas `shared` y `app` en el lint de fronteras, y `lint` pasa limpio.
- **El proceso se corrigió.** Hay ramas y PR en vez de trabajo directo sobre `main`.

**Veredicto: sigue sin aceptarse.** Cumplen 10 de 13: todos salvo el 2 (parcial: falta probar a mano el mapa mental completo), el 13 (parcial: falta la aprobación visual con capturas) y el 9 (la evaluación de sección 6, aún sin hacer).

**Observaciones nuevas:**
- **`develop` va 8 commits por delante de `main`.** El sitio publicado todavía no tiene las cuatro direcciones, la exportación a JSON ni el CI, y el README de `develop` ya los describe. Falta el PR de `develop` a `main`.
- **Los diagramas de prueba ya no están en el repo** (`trazo/fixtures/` desapareció). La evaluación de sección 6 los necesita, y los de 81 nodos son su caso de 50 nodos.
- **Sin pruebas propias** en `ElkLayoutEngine` ni en `FileSystemAccessGateway`. El RFC pedía solo integración mínima, así que no bloquea.
- **El build avisa de un bundle de más de 500 kB.** No es un fallo; conviene separar código si crece.

---

## 11. Cambios respecto al plan original (2026-10-12)

El RFC se actualiza con lo construido. Ninguna de estas diferencias fue un desvío en silencio: todas surgieron al construir, con Juan.

| Cambio | Dónde | Motivo |
|---|---|---|
| Ramas del mapa mental en cuatro direcciones (campo `side`, `Alt` + flechas) | F2, esquema | Mejora de uso al construir; estaba fuera del alcance original. Queda dentro de la v1 por estar ya hecha |
| Lado de las flechas del flujo (`fromSide`, `toSide`) y reconexión de extremos | F2, esquema | Las flechas automáticas no bastaban para ordenar un flujo a gusto |
| Exportación a JSON | F5, `Exporter` | Sale gratis del modelo y es la vía natural para que otras herramientas lo lean |
| Carpetas `api/`, `state/`, `shared/` y `app/` | sección 5.1 | El plugin de fronteras clasifica carpetas, no archivos sueltos: los archivos sueltos se escapaban de la regla |
| Flujo `develop` + ramas + PR + CI en PR | sección 5.2 | La primera tanda se hizo directo sobre `main`; se corrigió para respetar el flujo del repo |
| `style` opcional en nodos | esquema | Descartado: no hizo falta en la v1 |
