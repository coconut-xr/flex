import Yoga, {
    EDGE_BOTTOM,
    EDGE_LEFT,
    EDGE_RIGHT,
    EDGE_TOP,
    UNIT_AUTO,
    UNIT_PERCENT,
    UNIT_POINT,
    UNIT_UNDEFINED,
    YogaNode,
} from "yoga-layout-prebuilt"
import enumLookups from "./enum-lookups"
import nodeDefaults from "./node-defaults"

type EdgeProperties = keyof {
    [Key in keyof YogaNode as YogaNode[Key] extends (...args: infer X) => any
        ? X["length"] extends 2
            ? Uncapitalize<RemovePercentageAndAuto<TrimSet<Key>>>
            : never
        : never]: YogaNode[Key]
}

type CamelCaseFromSnakeCase<T extends string> = T extends `${infer M}_${infer N}`
    ? `${CamelCaseFromSnakeCase<M>}${Capitalize<CamelCaseFromSnakeCase<N>>}`
    : Lowercase<T>

type AlignType = GetEnumTypes<"align">

type Enums = {
    alignContent: AlignType
    alignItems: AlignType
    alignSelf: AlignType
    display: GetEnumTypes<"display">
    flexDirection: GetEnumTypes<"flex_direction">
    flexWrap: GetEnumTypes<"wrap">
    overflow: GetEnumTypes<"overflow">
    justifyContent: GetEnumTypes<"justify">
    positionType: GetEnumTypes<"position_type">
}

export const enumsToPrefix: { [Key in keyof Enums]: string } = {
    alignContent: "align",
    alignItems: "align",
    alignSelf: "align",
    display: "display",
    flexDirection: "flexDirection",
    flexWrap: "wrap",
    justifyContent: "justify",
    overflow: "overflow",
    positionType: "positionType",
}

export const snakeCaseFromCamelCase = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).toUpperCase()

export function toYoga(precision: number, name: string, value: any): any {
    if (value == null) {
        //default value
        value = nodeDefaults[name as keyof typeof nodeDefaults]
    }

    if (isKeyOf(name, enumsToPrefix)) {
        //string to yoga constant (number)
        const prefix = enumsToPrefix[name]
        if (typeof value != "string") {
            throw `"${value}" is not a valid value for "${name}", expected a string`
        }
        const key = `${snakeCaseFromCamelCase(prefix)}_${snakeCaseFromCamelCase(value)}`
        const constant = (Yoga as any)[key]
        if (constant == null) {
            throw `unkown value "${value}" for property "${name}"`
        }
        return constant
    }

    if (typeof value === "number") {
        //point value
        const number = value / precision
        if (!Number.isInteger(number)) {
            throw `bad precision ${precision}; the preicion must devide integers without rest`
        }
        return number
    }

    if (value == null) {
        return NaN
    }

    //string value (percentage / auto)
    return value
}

export function fromYoga(precision: number, name: string, value: any): any {
    if (typeof value === "object") {
        switch (value.unit) {
            case UNIT_AUTO:
                if (name === "flexBasis") {
                    return undefined //yoga returns unit auto, but there is not setFlexBasisAuto, therefore we can't let "auto" exist on flexBasis
                }
                value = "auto"
                break
            case UNIT_PERCENT:
                value = `${value.value}%`
                break
            case UNIT_POINT:
                value = value.value
                break
            case UNIT_UNDEFINED:
                value = undefined
                break
            default:
                throw `can't convert value "${value}" for property "${name}" from yoga`
        }
    }

    if (isKeyOf(name, enumLookups)) {
        //number to enum (string)
        const lookup = enumLookups[name]
        if (isKeyOf(value, lookup)) {
            return lookup[value]
        }
        throw `can't retranslate value "${value}" of property "${name}"`
    }

    if (typeof value === "number") {
        //point value
        return isNaN(value) ? undefined : value * precision
    }

    //string value (percentage / auto / undefined)
    return value
}

function isKeyOf<T>(key: any, value: T): key is keyof T {
    return key in value
}

export const edgeToConstant = {
    Top: EDGE_TOP,
    Bottom: EDGE_BOTTOM,
    Left: EDGE_LEFT,
    Right: EDGE_RIGHT,
}

export type RemoveEdge<T extends keyof YogaNodeProperties> = T extends AllEdges<infer K> ? K : T

type GetEnumTypes<Prefix extends string> = GetEnumTypes_<keyof typeof Yoga, Prefix>
type GetEnumTypes_<T, Prefix extends string> = T extends `${Uppercase<Prefix>}_${infer T}`
    ? CamelCaseFromSnakeCase<T>
    : never

export type YogaNodeProperties = {
    [Key in Exclude<Uncapitalize<RemovePercentageAndAuto<TrimSet<keyof YogaNode>>>, EdgeProperties | "flex">]:
        | GetType<`set${Capitalize<Key>}`, YogaNode, 0>
        | undefined
} & {
    [Key in AllEdges<EdgeProperties>]: GetType<`set${Capitalize<RemoveEdge<Key>>}`, YogaNode, 1> | undefined
}

type GetType<T extends keyof O, O, index extends 0 | 1> = T extends `set${Capitalize<keyof Enums>}`
    ? Enums[Uncapitalize<TrimSet<T>>]
    : O[T] extends (...args: infer K) => any
    ? K[index]
    : never
type AllEdges<T extends string> = `${T}${"Top" | "Bottom" | "Right" | "Left"}`
type RemovePercentageAndAuto<Name extends string> = Name extends `${string}${"Percent" | "Auto"}` ? never : Name
type TrimSet<Name extends string> = Name extends `set${infer X}` ? X : never
