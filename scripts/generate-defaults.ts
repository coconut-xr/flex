import { EDGE_BOTTOM, EDGE_LEFT, EDGE_RIGHT, EDGE_TOP, Node } from "yoga-layout-prebuilt"
import { writeFileSync } from "fs"

const node = Node.create()
export const edges = new Set(["border", "padding", "margin", "position"])
export const propertyNamesWithFnNames: Array<[string, string]> = Object.keys(Object.getPrototypeOf(node))
    .map<Array<[string, string]>>((fnName) => {
        if (
            fnName.startsWith("get") &&
            !fnName.includes("Computed") &&
            !fnName.includes("Child") &&
            !fnName.includes("Parent")
        ) {
            const propertyName = `${fnName.charAt(3).toLowerCase()}${fnName.slice(4)}`
            return [[propertyName, fnName]]
        }
        return []
    })
    .reduce((v1, v2) => v1.concat(v2))

const result: any = {}

function addEdgeValues(name: string, key: string): void {
    result[`${name}Top`] = flatten(node[key as "getMargin"](EDGE_TOP))
    result[`${name}Bottom`] = flatten(node[key as "getMargin"](EDGE_BOTTOM))
    result[`${name}Left`] = flatten(node[key as "getMargin"](EDGE_LEFT))
    result[`${name}Right`] = flatten(node[key as "getMargin"](EDGE_RIGHT))
}

propertyNamesWithFnNames.forEach(([propertyName, fnName]) => {
    if (edges.has(propertyName)) {
        addEdgeValues(propertyName, fnName)
    } else {
        result[propertyName] = flatten(node[fnName as "getWidth"]())
    }
})

function flatten(val: any): any {
    if (typeof val === "object" && "value" in val) {
        return val.value
    }
    return val
}

writeFileSync("src/node-defaults.ts", `export default ${JSON.stringify(result).replace(/null/g, "NaN")}`)
