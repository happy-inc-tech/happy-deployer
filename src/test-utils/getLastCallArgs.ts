import {SpyInstance} from "vitest";

export const getLastCallArgs = (value: SpyInstance): any[] => {
    if (!value.mock.lastCall) {
        throw new Error('No last call found')
    }
    return value.mock.lastCall
}