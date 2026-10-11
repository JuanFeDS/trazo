import type { Diagram } from './diagram';

export const exampleDiagram: Diagram = {
  version: 1,
  type: 'flowchart',
  title: 'Inicio de sesión',
  nodes: [
    { id: 'start', kind: 'start', label: 'Abrir la app', position: { x: 240, y: 0 } },
    { id: 'form', kind: 'process', label: 'Pedir correo y contraseña', position: { x: 240, y: 120 } },
    { id: 'valid', kind: 'decision', label: '¿Credenciales válidas?', position: { x: 240, y: 240 } },
    { id: 'home', kind: 'process', label: 'Mostrar el panel', position: { x: 0, y: 440 } },
    { id: 'error', kind: 'process', label: 'Mostrar el error', position: { x: 480, y: 440 } },
    { id: 'end', kind: 'end', label: 'Sesión iniciada', position: { x: 0, y: 560 } },
  ],
  edges: [
    { id: 'e1', from: 'start', to: 'form' },
    { id: 'e2', from: 'form', to: 'valid' },
    { id: 'e3', from: 'valid', to: 'home', label: 'Sí' },
    { id: 'e4', from: 'valid', to: 'error', label: 'No' },
    { id: 'e5', from: 'home', to: 'end' },
    { id: 'e6', from: 'error', to: 'form' },
  ],
};
