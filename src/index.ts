export * from "./property-conversion.js";
export * from "./property-map.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as Yoga from "yoga-wasm-web";
import { encoded } from "./yoga.js";

export function loadYoga(): Promise<Yoga.Yoga> {
  return Yoga.default(Buffer.from(encoded, "base64"));
}
