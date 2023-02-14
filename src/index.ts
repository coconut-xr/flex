export * from "./properties.js"
export * from "./flex-node.js"
import { encoded } from "./yoga.js"
export * from "./property-map.js"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as Yoga from "yoga-wasm-web"

export function loadYoga(): Promise<Yoga.Yoga> {
    return Yoga.default(Buffer.from(encoded, "base64"))
}
