export type PropertyInformation =
    | {
          type: "enum"
          enumMap: { [key in string]?: number }
          default: string
          manual: true
      }
    | {
          type: "value"
          default: number | "auto" | null
          pointUnit: boolean
          percentUnit: boolean
          autoUnit: boolean
          manual: true
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

    if (typeof value === "number" && propertyInformation.pointUnit) {
        //point value
        return Math.round(value / precision)
    }

    if (value == null) {
        return NaN
    }

    //number / percent / auto
    return value
}

export function fromYoga(
    precision: number,
    propertyInformation:
        | PropertyInformation
        | {
              type: "value"
              manual: false
          },
    name: string,
    value: any
): any {
    if (typeof value === "object") {
        switch (value.unit) {
            case 3: //Yoga.UNIT_AUTO:
                if (name === "flexBasis") {
                    return null //yoga returns unit auto, but there is not setFlexBasisAuto, therefore we can't let "auto" exist on flexBasis
                }
                value = "auto"
                break
            case 2: //Yoga.UNIT_PERCENT
                value = `${value.value}%`
                break
            case 1: //Yoga.UNIT_POINT:
                value = value.value
                break
            case 0: //Yoga.UNIT_UNDEFINED:
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
        if (isNaN(value)) {
            return null
        }
        return !propertyInformation.manual || propertyInformation.pointUnit ? value * precision : value
    }

    //string value (percent / auto / null)
    return value
}
