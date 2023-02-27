export * from "./utils.js"
export * from "./setter.js"

import createYoga, { Yoga } from "yoga-wasm-web";
import { encoded } from "./wasm.js";

export function loadYoga(): Promise<Yoga> {
  return createYoga(Buffer.from(encoded, "base64"))
}
