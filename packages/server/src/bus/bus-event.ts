import type { ZodType } from 'zod/v4';
import { z } from 'zod/v4';

export namespace BusEvent {
  export type Definition = ReturnType<typeof define>;

  const registry = new Map<string, Definition>();

  export function define<Type extends string, Properties extends ZodType>(type: Type, properties: Properties) {
    const result = { type, properties };
    registry.set(type, result);
    return result;
  }

  /** Build a Zod union of all registered event payloads (for OpenAPI). */
  export function payloads(): ZodType {
    const schemas = [...registry.entries()].map(([type, def]) =>
      z.object({
        type: z.literal(type),
        properties: def.properties,
      }),
    );
    if (schemas.length === 0) return z.never();
    const first = schemas[0];
    if (schemas.length === 1 && first) return first;
    return z.union(schemas as unknown as [ZodType, ZodType, ...ZodType[]]);
  }
}
