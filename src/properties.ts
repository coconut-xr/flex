import { UNIT_AUTO, UNIT_PERCENT, UNIT_POINT, UNIT_UNDEFINED } from "yoga-layout-prebuilt"

export type PropertyInformation =
    | {
          type: "enum"
          enumMap: { [key in string]?: number }
          default: string
      }
    | {
          type: "value"
          default: number | "auto" | null
          percentage: boolean
          auto: boolean
      }

export function toYoga(precision: number, propertyInformation: PropertyInformation, name: string, value: any): any {
    if (value == null) {
        //default value
        value = propertyInformation.default
    }

    if (propertyInformation.type === "enum") {
        //string to yoga constant (number)
        if (typeof value != "string") {
            throw `"${value}" is not a valid value for "${name}", expected a string`
        }
        const constant = propertyInformation.enumMap[value]
        if (constant == null) {
            throw `unkown value "${value}" for property "${name}"`
        }
        return constant
    }

    if (typeof value === "number") {
        //point value
        const number = value / precision
        if (!Number.isInteger(number)) {
            throw `bad/low precision "${precision}"; the preicion must devide the values without rest`
        }
        return number
    }

    if (value == null) {
        return NaN
    }

    //string value (percentage / auto)
    return value
}

export function fromYoga(precision: number, propertyInformation: PropertyInformation, name: string, value: any): any {
    if (typeof value === "object") {
        switch (value.unit) {
            case UNIT_AUTO:
                if (name === "flexBasis") {
                    return null //yoga returns unit auto, but there is not setFlexBasisAuto, therefore we can't let "auto" exist on flexBasis
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
                value = null
                break
            default:
                throw `can't convert value "${JSON.stringify(value)}" for property "${name}" from yoga`
        }
    }

    if (propertyInformation.type === "enum") {
        //number to enum (string)
        const entry = Object.entries(propertyInformation.enumMap).find(([_, v]) => v === value)
        if (entry == null) {
            throw `can't retranslate value "${value}" of property "${name}"`
        }
        return entry[0]
    }

    if (typeof value === "number") {
        //point value
        return isNaN(value) ? null : value * precision
    }

    //string value (percentage / auto / null)
    return value
}
