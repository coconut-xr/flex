import Yoga, { EDGE_BOTTOM, EDGE_LEFT, EDGE_RIGHT, EDGE_TOP, Node } from "yoga-layout-prebuilt"
import { writeFileSync } from "fs"
import { fromYoga } from "../src/properties"

const node = Node.create()

const propertiesWithEdge = new Set(["border", "padding", "margin", "position"])

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
    Top: EDGE_TOP,
    Left: EDGE_LEFT,
    Right: EDGE_RIGHT,
    Bottom: EDGE_BOTTOM,
}
const yogaKeys = Object.entries(Yoga)

const kebabCaseFromSnakeCase = (str: string) => str.toLowerCase().replace(/_[a-z]/g, (letter) => `-${letter.slice(1)}`)

const result = Object.keys(Object.getPrototypeOf(node))
    .map<Array<[string, string]>>((fnName) => {
        if (
            fnName.startsWith("get") &&
            !fnName.includes("Computed") &&
            !fnName.includes("Child") &&
            !fnName.includes("Parent")
        ) {
            const baseFnName = fnName.slice(3)
            const propertyName = `${baseFnName.charAt(0).toLowerCase()}${baseFnName.slice(1)}`
            return [[propertyName, baseFnName]]
        }
        return []
    })
    .reduce((v1, v2) => v1.concat(v2))
    .reduce((prev, [propertyName, functionName]) => {
        const enumPrefix = enumsToPrefix[propertyName]
        let propertyInfo: any
        if (enumPrefix != null) {
            propertyInfo = {
                type: "enum",
                functionName,
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
        } else {
            propertyInfo = {
                type: "value",
                functionName,
                percentage: node[`set${functionName}Percent` as unknown as keyof typeof node] != null,
                auto: node[`set${functionName}Auto` as unknown as keyof typeof node] != null,
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
                            node[`get${functionName}` as "getBorder"](edge)
                        ),
                        edge,
                    },
                }
            }, prev)
        }
        return {
            ...prev,
            [propertyName]: {
                ...propertyInfo,
                default: fromYoga(1, propertyInfo, propertyName, node[`get${functionName}` as "getWidth"]()),
            },
        }
    }, {} as any)

writeFileSync("src/property-map.ts", `export default ${JSON.stringify(result)} as const`)
