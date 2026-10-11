import type { FlowchartDiagram, MindmapDiagram } from './diagram';

export const exampleFlowchart: FlowchartDiagram = {
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

export const exampleMindmap: MindmapDiagram = {
  version: 1,
  type: 'mindmap',
  title: 'Plan de portafolio',
  nodes: [
    { id: 'root', label: 'Portafolio', parent: null },
    { id: 'content', label: 'Contenido', parent: 'root' },
    { id: 'projects', label: 'Proyectos destacados', parent: 'content' },
    { id: 'about', label: 'Sobre mí', parent: 'content' },
    { id: 'design', label: 'Diseño', parent: 'root' },
    { id: 'palette', label: 'Paleta y tipografía', parent: 'design' },
    { id: 'dark', label: 'Tema oscuro', parent: 'design' },
    { id: 'launch', label: 'Lanzamiento', parent: 'root' },
    { id: 'domain', label: 'Dominio y hosting', parent: 'launch' },
    { id: 'seo', label: 'SEO básico', parent: 'launch' },
    { id: 'share', label: 'Difusión', parent: 'root' },
  ],
};
