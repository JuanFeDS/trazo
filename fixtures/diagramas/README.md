# Diagramas de prueba

Archivos `.json` para probar Trazo: unos que deben abrirse sin problema y otros que deben rechazarse con un error claro. Los usan dos cosas:

- **Las pruebas automáticas** (`apps/web/test/fixtures/fixtures.test.ts`): comprueban cada archivo contra el esquema en cada ejecución de `npm test`.
- **La evaluación manual del RFC-004** (sección 6 y criterios 5 y 6): abrirlos en la app con **Abrir** o `Ctrl` + `O`.

## Válidos (`validos/`)

Deben abrirse y dibujarse sin avisos.

| Archivo | Qué es | Qué mirar |
|---|---|---|
| `flujo-simple.json` | Diagrama de flujo de 5 nodos **sin posiciones** | Que el auto-layout lo ordene solo (criterio 3) |
| `flujo-con-posiciones.json` | Diagrama de flujo de 6 nodos con posiciones y lados de flechas (`fromSide`, `toSide`) | Que se vea tal como está guardado, sin reordenarse |
| `mapa-mental-simple.json` | Mapa mental de 7 nodos, con una rama a la izquierda y otra hacia arriba (`side`) | Que cada rama salga hacia donde dice |
| `mapa-mental-grande.json` | Mapa mental de **81 nodos**: raíz, 8 áreas (en las cuatro direcciones), 3 temas por área y 2 detalles por tema | El caso de 50 nodos de la sección 6: ordenar, mover y exportar sin lag perceptible |

## Inválidos (`invalidos/`)

Deben mostrar un aviso de error y **no romper la app** (criterio 6). El diagrama que tuvieras abierto debe seguir como estaba.

| Archivo | Qué le pasa | Error esperado |
|---|---|---|
| `json-roto.json` | El texto se corta a la mitad: no es JSON | `El archivo no es JSON válido` |
| `sin-version.json` | Falta el campo `version` | `version: falta o no es un entero válido` |
| `tipo-desconocido.json` | `type` es `gantt`, un tipo que Trazo no tiene | `type: debe ser flowchart o mindmap` |
| `arista-huerfana.json` | Una conexión apunta a un nodo que no existe | `edges[0].to: el nodo "fantasma" no existe` |
| `padre-inexistente.json` | Un nodo del mapa mental tiene un padre que no existe | `nodes[1].parent: el nodo "fantasma" no existe` |

## Cómo se construyó el grande

`mapa-mental-grande.json` sigue una regla fija, por si hay que regenerarlo: `1 + 8 + 8×3 + 8×3×2 = 81` nodos. Los ids son `raiz`, `r1`…`r8`, `r1-h1`…`r8-h3` y `r1-h1-n1`…`r8-h3-n2`; las áreas reparten su `side` así: derecha, izquierda, arriba, abajo, derecha, izquierda, derecha, izquierda.
