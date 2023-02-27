import { writeFileSync } from "fs";
import {
  EDGE_BOTTOM,
  EDGE_LEFT,
  EDGE_RIGHT,
  EDGE_TOP,
  Node,
  UNIT_AUTO,
  UNIT_PERCENT,
  UNIT_POINT,
  UNIT_UNDEFINED,
} from "yoga-wasm-web";
import createYoga from "yoga-wasm-web";
import { encoded } from "../src/wasm.js";
import { GUTTER_ROW, GUTTER_COLUMN } from "yoga-wasm-web";

async function main() {
  const yoga = await createYoga(Buffer.from(encoded, "base64"));
  const node = yoga.Node.create();

  const propertiesWithEdge = new Set(["border", "padding", "margin", "position"]);
  const propertiesWithGutter = new Set(["gap"]);
  const propertiesWithoutPointUnit = new Set(["aspectRatio", "flexGrow", "flexShrink"]);

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
  };

  const edgeMap = {
    Top: EDGE_TOP,
    Left: EDGE_LEFT,
    Right: EDGE_RIGHT,
    Bottom: EDGE_BOTTOM,
  };
  const gutterMap = {
    Row: GUTTER_ROW,
    Column: GUTTER_COLUMN
  };
  const yogaKeys = Object.entries(yoga);

  const kebabCaseFromSnakeCase = (str: string) =>
    str.toLowerCase().replace(/_[a-z]/g, (letter) => `-${letter.slice(1)}`);

  const nodeKeys = Object.keys(Object.getPrototypeOf(node));

  //TODO: setGrapColumn, setGapRow

  const properties = nodeKeys
    .filter(
      (keyName) =>
        keyName.startsWith("get") &&
        !keyName.includes("Child") &&
        !keyName.includes("Parent") &&
        !keyName.startsWith("getComputed"),
    )
    .map<[string, string]>((fnName) => {
      const baseFnName = fnName.slice("get".length);
      const propertyName = `${baseFnName.charAt(0).toLowerCase()}${baseFnName.slice(1)}`;
      return [propertyName, baseFnName];
    });
  const lookupTables = new Map<string, string>();
  const setterFunctions: Array<[string, string]> = [];
  for (const [propertyName, functionName] of properties) {
    const enumPrefix = enumsToPrefix[propertyName];
    let convertFunction: (
      defaultValue: string | number | null,
      setter: (value?: string) => string,
    ) => string;
    let types: Array<string>;
    if (enumPrefix != null) {
      const enums = yogaKeys.filter(([key]) => key.startsWith(enumPrefix));
      const lutName = `${enumPrefix}LUT`;
      if (!lookupTables.has(lutName)) {
        lookupTables.set(
          lutName,
          createLookupTable(
            lutName,
            enums.map(([name, value]) => [
              kebabCaseFromSnakeCase(name.slice(enumPrefix.length)),
              value as any,
            ]),
          ),
        );
      }
      convertFunction = (defaultValue, setter) =>
        setter(
          `convertEnum(${lutName}, input, ${
            defaultValue === null || isNaN(defaultValue as any)
              ? "NaN"
              : JSON.stringify(defaultValue)
          })`,
        );
      types = [
        ...enums.map(([name]) => `"${kebabCaseFromSnakeCase(name.slice(enumPrefix.length))}"`),
        "undefined",
      ];
    } else {
      const percentUnit = node[`set${functionName}Percent` as keyof Node] != null;
      const autoUnit = node[`set${functionName}Auto` as keyof Node] != null;
      const pointUnit = !propertiesWithoutPointUnit.has(propertyName);
      types = ["undefined", "number"];
      if (percentUnit) {
        types.push("`${number}%`");
      }
      if (autoUnit) {
        types.push(`"auto"`);
      }
      convertFunction = (defaultValue, setter) => {
        const defaultValueString =
          defaultValue === null || isNaN(defaultValue as any)
            ? "NaN"
            : JSON.stringify(defaultValue);
        return setter(
          pointUnit
            ? `convertPoint(input, precision, ${defaultValueString})`
            : `input ?? ${defaultValueString}`,
        );
      };
    }
    if (propertiesWithEdge.has(propertyName)) {
      for (const [edgeKey, edge] of Object.entries(edgeMap)) {
        const defaultValue = fromYoga(
          propertyName,
          node[`get${functionName}` as "getBorder"](edge),
        );
        const edgePropertyName = `${propertyName}${edgeKey}`;
        setterFunctions.push([
          edgePropertyName,
          `(node: Node, precision: number, input: ${types.join(" | ")}) =>
              ${convertFunction(
                defaultValue,
                (value) => `
                  node.set${functionName}(${edge}, ${value})`,
              )}`,
        ]);
      }
    } else if(propertiesWithGutter.has(propertyName)) {
      for (const [gutterKey, gutter] of Object.entries(gutterMap)) {
        const defaultValue = fromYoga(
          propertyName,
          node[`get${functionName}` as "getGap"](gutter),
        );
        const gutterPropertyName = `${propertyName}${gutterKey}`;
        setterFunctions.push([
          gutterPropertyName,
          `(node: Node, precision: number, input: ${types.join(" | ")}) =>
              ${convertFunction(
                defaultValue,
                (value) => `
                  node.set${functionName}(${gutter}, ${value})`,
              )}`,
        ]);
      }
    } else {
      const defaultValue = fromYoga(propertyName, node[`get${functionName}` as "getWidth"]());
      setterFunctions.push([
        propertyName,
        `(node: Node, precision: number, input: ${types.join(" | ")}) =>
          ${convertFunction(
            defaultValue,
            (value) => `
              node.set${functionName}(${value})`,
          )}`,
      ]);
    }
  }

  writeFileSync(
    "src/setter.ts",
    `import { Node } from "yoga-wasm-web"
    function convertEnum<T extends { [Key in string]: number }>(lut: T, input: keyof T | undefined, defaultValue: T[keyof T]): T[keyof T] {
      if(input == null) {
        return defaultValue
      }
      const resolvedValue = lut[input]
      if(resolvedValue == null) {
        throw new Error(\`unexpected value ${"${input as string}"}, expected ${"${Object.keys(lut).join(\", \")}"}\`)
      }
      return resolvedValue
    }
    function convertPoint<T>(input: T | undefined, precision: number, defaultValue: T): T | number {
      if(typeof input === "number") {
        return Math.round(input / precision)
      }
      return input ?? defaultValue
    }
    ${Array.from(lookupTables.values()).join("\n")}
    export const setter = { ${setterFunctions
      .map(([propertyName, functionCode]) => `${propertyName}: ${functionCode}`)
      .join(",\n")} }`,
  );
}

function createLookupTable(name: string, values: Array<[string, string]>): string {
  return `const ${name} = {
    ${values.map(([key, value]) => `"${key}": ${value}`).join(",\n")}
  } as const`;
}

function fromYoga(name: string, value: any): "auto" | `${number}%` | number | null {
  if (typeof value === "object") {
    switch (value.unit) {
      case UNIT_AUTO:
        return "auto";
      case UNIT_PERCENT:
        return `${value.value}%`;
      case UNIT_POINT:
        return value.value ?? null;
      case UNIT_UNDEFINED:
        return null;
    }
  }
  if (typeof value === "number") {
    return value;
  }
  throw `can't convert value "${JSON.stringify(value)}" for property "${name}" from yoga`;
}

main().catch(console.error);
