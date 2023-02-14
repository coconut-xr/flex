import { writeFileSync } from "fs"
import { fromYoga } from "../src/properties.js"
import { loadYoga } from "../src/index.js"

async function main() {
    const yoga = await loadYoga()
    const node = yoga.Node.create()

    const propertiesWithEdge = new Set(["border", "padding", "margin", "position", "gap"])
    const propertiesWithoutPointUnit = new Set(["aspectRatio", "flexGrow", "flexShrink"])

    const enumsToPrefix: { [key in string]: string } = {
        alignContent: "ALIGN_",
        alignItems: "ALIGN_",
        alignSelf: "ALIGN_",
        display: "DISPLAY_",
        flexDirection: "FLEX_DIRECTION_",
        flexWrap: "WRAP_",
        justifyContent: "JUSTIFY_",
        overflow: "OVERFLOW_",
        positionType: "POSITION_TYPE_",
    }

    const edgeMap = {
        Top: 1, //EDGE_TOP,
        Left: 0, //EDGE_LEFT
        Right: 2, //EDGE_RIGHT
        Bottom: 3, //EDGE_BOTTOM
    }
    const yogaKeys = Object.entries(yoga)

    const kebabCaseFromSnakeCase = (str: string) =>
        str.toLowerCase().replace(/_[a-z]/g, (letter) => `-${letter.slice(1)}`)

    const nodeKeys = Object.keys(Object.getPrototypeOf(node))

    const result = nodeKeys
        .map<Array<[string, string, boolean]>>((fnName) => {
            if (!fnName.startsWith("get") || fnName.includes("Child") || fnName.includes("Parent")) {
                return []
            }
            if (fnName.startsWith("getComputed")) {
                const baseFnName = fnName.slice("getComputed".length)
                if (nodeKeys.includes(`get${baseFnName}`)) {
                    return []
                }
                const propertyName = `${baseFnName.charAt(0).toLowerCase()}${baseFnName.slice(1)}`
                return [[propertyName, baseFnName, false]]
            }
            const baseFnName = fnName.slice("get".length)
            const propertyName = `${baseFnName.charAt(0).toLowerCase()}${baseFnName.slice(1)}`
            return [[propertyName, baseFnName, true]]
        })
        .reduce((v1, v2) => v1.concat(v2))
        .reduce((prev, [propertyName, functionName, manual]) => {
            const enumPrefix = enumsToPrefix[propertyName]
            let propertyInfo: any
            if (manual && enumPrefix != null) {
                propertyInfo = {
                    type: "enum",
                    functionName,
                    manual: true,
                    enumMap: yogaKeys
                        .filter(([key]) => key.startsWith(enumPrefix))
                        .reduce(
                            (prev, [name, value]) => ({
                                [kebabCaseFromSnakeCase(name.slice(enumPrefix.length))]: value,
                                ...prev,
                            }),
                            {} as any
                        ),
                }
            } else if (manual) {
                propertyInfo = {
                    type: "value",
                    manual: true,
                    functionName,
                    computed: node[`getComputed${functionName}`] != null,
                    percentUnit: node[`set${functionName}Percent`] != null,
                    autoUnit: node[`set${functionName}Auto`] != null,
                    pointUnit: !propertiesWithoutPointUnit.has(propertyName),
                }
            } else {
                propertyInfo = {
                    type: "value",
                    manual: false,
                    functionName,
                    computed: node[`getComputed${functionName}`] != null,
                }
            }
            if (propertiesWithEdge.has(propertyName)) {
                return Object.entries(edgeMap).reduce((prev, [edgeKey, edge]) => {
                    const edgePropertyName = `${propertyName}${edgeKey}`
                    return {
                        ...prev,
                        [edgePropertyName]: {
                            ...propertyInfo,
                            default: fromYoga(
                                1,
                                propertyInfo,
                                edgePropertyName,
                                node[`get${functionName}` as "getBorder"](edge as any)
                            ),
                            edge,
                        },
                    }
                }, prev)
            }
            if (manual) {
                propertyInfo.default = fromYoga(
                    1,
                    propertyInfo,
                    propertyName,
                    node[`get${functionName}` as "getWidth"]()
                )
            }
            return {
                ...prev,
                [propertyName]: propertyInfo,
            }
        }, {} as any)

    writeFileSync("src/property-map.ts", `export const propertyMap = ${JSON.stringify(result)} as const`)
}

main().catch(console.error)
