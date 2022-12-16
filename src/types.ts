export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type ValuesOf<T extends Record<string, unknown>> = T[keyof T];
