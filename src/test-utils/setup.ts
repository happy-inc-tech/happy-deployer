import 'reflect-metadata';
import createContainer from '../container/index.js';
import { interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;

globalThis.diContainer = createContainer();

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default function () {}

export function getServiceForTests<T>(serviceConstructor: ServiceIdentifier<T>) {
  if (!globalThis.diContainer) {
    throw new Error('No DI container');
  }
  return globalThis.diContainer.get<T>(serviceConstructor);
}
