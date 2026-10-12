# RFC-004 — Trazo: app web de diagramas con modelo JSON

| Campo | Valor |
|---|---|
| Estado | 🟢 Aprobado el 2026-10-11 · v1 aceptada el 2026-10-12 (13 de 13 criterios, ver sección 10) |
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
├── fixtures/diagramas/       # diagramas de prueba, válidos e inválidos (los valida una prueba de `web`)
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

**Estado del despliegue (2026-10-12):** el sitio publicado corresponde a `main` en `40c0ea0`, la versión anterior a las ramas en cuatro direcciones, la exportación a JSON y el CI. `develop` está 13 commits por delante y el PR a `main` está en espera por decisión de Juan; no se hace hasta que pasen los 13 criterios, y ya pasan. Hasta entonces `juanfeds.com/trazo` no muestra la v1 aceptada.

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

*Adaptación del 2026-10-12:* Juan no usaba ninguna herramienta antes, así que la comparación contra la anterior no se pudo hacer; el resto de la evaluación se cumplió (ver sección 10).

## 7. Hitos

- ✅ **H1.** Repo con `core` y `web`, tokens de diseño, Vite + React + React Flow y un diagrama de flujo editable en memoria.
- ✅ **H2.** Mapa mental con atajos de teclado y auto-layout con elkjs.
- ✅ **H3.** Persistencia: IndexedDB, abrir y guardar `.json`, esquema validado.
- ✅ **H4.** Exportar SVG y PNG, deshacer/rehacer, publicación automática en GitHub Pages (sección 5.2) y README.

Los cuatro hitos se construyeron el 2026-10-11. La revisión de los criterios de aceptación y la evaluación de la sección 6 se cerraron el 2026-10-12: la v1 cumple los 13 (ver sección 10).

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

### Estado actual (2026-10-12): 13 de 13 criterios cumplen

La v1 está aceptada. Revisión de Faro sobre `develop` en `2556ac7` (sin código nuevo desde entonces), más las pruebas en vivo de Juan. Verificado en local: `typecheck`, `lint` y 98 pruebas en verde (67 de `core`, 31 de `web`).

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Desplegado, sin cuenta ni servidor | ✅ | `juanfeds.com/trazo` responde 200 (versión de `main`, ver sección 5.2) |
| 2 | Crear, editar y borrar ambos tipos | ✅ | Juan lo probó a mano; 16 pruebas de `core` en el mapa mental |
| 3 | Auto-layout al abrir sin posiciones | ✅ | `ElkLayoutEngine`, botón "Reordenar" y los diagramas de prueba |
| 4 | Persistencia en el navegador | ✅ | `IndexedDbRepository` con 6 pruebas |
| 5 | `.json` en disco, mismo diagrama | ✅ | Prueba de ida y vuelta en `core` y prueba manual de Juan |
| 6 | Archivo inválido, error claro | ✅ | 5 diagramas inválidos, cada uno falla por su motivo con mensaje claro |
| 7 | Exporta SVG y PNG | ✅ | Exportadores y 9 pruebas de la escena exportada; además JSON |
| 8 | Esquema en el README, con `version` | ✅ | README, sección "Esquema del archivo JSON" |
| 9 | Evaluación de la sección 6 | ✅ adaptada | Respuestas de Juan abajo; sin comparación porque no había herramienta previa |
| 10 | Repo público, README, MIT, nombre | ✅ | `JuanFeDS/trazo`, público, licencia MIT |
| 11 | `core` sin React ni DOM, lint pasa | ✅ | `eslint-plugin-boundaries` y prohibiciones de imports y globales |
| 12 | Pruebas de `core` en `test/` | ✅ | Operaciones, esquema y migraciones, espejando `src/` |
| 13 | Tema claro y oscuro, aprobación visual | ✅ | `tokens.css`, selector de tema; Juan aprobó el diseño en vivo |

**Respuestas de Juan sobre sus pruebas en vivo** (no quiso redactarlas, Faro le hizo siete preguntas):

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Armó diagramas reales de los dos tipos? | Sí, de mapa mental y de flujo, y funcionaron |
| 2 | ¿Los comparó con su herramienta anterior? | No aplica: no usaba ninguna |
| 3 | ¿Tardó más o menos que antes? | No aplica |
| 4 | ¿Qué le gustó o molestó? | Le gustó en general; nada que lo moleste |
| 5 | ¿Probó el mapa de 81 nodos sin lag? | Sí |
| 6 | ¿Probó el mapa mental completo? | Sí |
| 7 | ¿Aprueba el diseño en claro y oscuro? | Sí |

El criterio 13 pedía capturas y se aprobó en vivo; el criterio 9 pedía comparar contra una herramienta anterior y no se pudo. Faro acepta las dos adaptaciones porque aprobar el diseño es decisión de Juan y no había herramienta previa. La fuente de estos tres criterios (2, 9 y 13) es la palabra de Juan.

**Observaciones vigentes, sin bloqueo:**
- `develop` va 13 commits por delante de `main`, y el PR espera la decisión de Juan.
- El build avisa de un bundle de más de 500 kB; conviene separar código si crece.
- `ElkLayoutEngine` y `FileSystemAccessGateway` no tienen pruebas propias. El RFC pedía solo integración mínima.

### Historial de la revisión

| Pasada | Sobre | Criterios que cumplían |
|---|---|---|
| Primera | `main` en `40c0ea0` | 8 de 13 (parciales: 2, 5, 6, 13; falta el 9) |
| Segunda | `develop` en `6c05b69` y pruebas manuales de Juan | 10 de 13 (quedaban 2, 9 y 13) |
| Tercera | `develop` en `2556ac7`, con los diagramas de prueba en el repo | 10 de 13 |
| Cierre | Respuestas de Juan sobre sus pruebas | 13 de 13 |

En el camino se corrigió el proceso (primero se trabajaba directo sobre `main`, luego ramas y PR) y se cerró la advertencia del lint de fronteras. El detalle de cada paso está en el historial de git de este repo.

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
| Carpeta `fixtures/diagramas/` con una prueba que los valida | estructura | Los diagramas de prueba sirven a las pruebas manuales y automáticas, y son el caso de más de 50 nodos de la sección 6 |
| Evaluación de sección 6 sin comparación contra una herramienta anterior | sección 6, criterio 9 | Juan no usaba ninguna herramienta antes; se aceptó por palabra de Juan (2026-10-12) |
