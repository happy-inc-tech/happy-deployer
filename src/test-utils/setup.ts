import 'reflect-metadata'
import createContainer from "../container/create-container.js";
import {interfaces} from "inversify";
import ServiceIdentifier = interfaces.ServiceIdentifier;

globalThis.diContainer = createContainer()

export default function () {}

export function getService<T>(serviceConstructor: ServiceIdentifier<T>) {
    if (!globalThis.diContainer) {
        throw new Error('No DI container')
    }
    return globalThis.diContainer.get<T>(serviceConstructor)
}