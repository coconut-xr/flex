import createYoga, { Yoga } from "yoga-wasm-web";
import { base64 } from "./wasm.js";
import { toByteArray } from "base64-js";

export function loadYoga(): Promise<Yoga> {
  return createYoga(toByteArray(base64));
}
