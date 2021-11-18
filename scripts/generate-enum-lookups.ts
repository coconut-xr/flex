import Yoga, { Node } from "yoga-layout-prebuilt"
import { writeFileSync } from "fs"
import { enumsToPrefix, snakeCaseFromCamelCase } from "../src"

const yogaKeys = Object.entries(Yoga)

export const camelCaseFromSnakeCase = (str: string) =>
    str.toLowerCase().replace(/_[a-z]/g, (letter) => letter.slice(1).toUpperCase())

const result = Object.entries(enumsToPrefix).reduce((prev, [name, p]) => {
    const prefix = `${snakeCaseFromCamelCase(p)}_`
    return {
        ...prev,
        [name]: yogaKeys
            .filter(([key]) => key.startsWith(prefix))
            .reduce(
                (prev, [name, value]) => ({
                    [value]: camelCaseFromSnakeCase(name.slice(prefix.length)),
                    ...prev,
                }),
                {} as any
            ),
    }
}, {} as any)

writeFileSync("src/enum-lookups.ts", `export default ${JSON.stringify(result)}`)
