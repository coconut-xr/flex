import createYoga, { Yoga } from "yoga-wasm-web";
import { encoded } from "./wasm.js";
import { toByteArray } from "base64-js";

export function loadYoga(): Promise<Yoga> {
  return createYoga(toByteArray(encoded));
}
