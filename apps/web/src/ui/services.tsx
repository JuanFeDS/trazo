import type { DiagramRepository, FileGateway, LayoutEngine } from '@trazo/core';
import { createContext, useContext } from 'react';

export interface Services {
  layoutEngine: LayoutEngine;
  repository: DiagramRepository;
  files: FileGateway;
}

const ServicesContext = createContext<Services | null>(null);

export const ServicesProvider = ServicesContext.Provider;

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('Falta el ServicesProvider');
  }
  return services;
}
