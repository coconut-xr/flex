import { fromYoga, propertyMap, toYoga } from "./index.js";
import { MeasureFunction, Node } from "yoga-wasm-web";

type PropertyMap = typeof propertyMap;

export type ReadableYogaNodeProperties = {
  [Key in keyof PropertyMap]?: PropertyMap[Key] extends { type: "enum"; enumMap: object }
    ? keyof PropertyMap[Key]["enumMap"]
    :
        | number
        | (PropertyMap[Key] extends { autoUnit: true } ? "auto" : never)
        | (PropertyMap[Key] extends {
            percentUnit: true;
          }
            ? `${number}%`
            : never);
};

export type WriteableYogaNodeProperties = ReadableYogaNodeProperties & {
  measureFunc?: MeasureFunction;
};

function yogaNodeEqual(n1: Node, n2: Node): boolean {
  return (n1 as any)["__nbindPtr"] === (n2 as any)["__nbindPtr"];
}

function isNotMeasureFunc(
  value: keyof WriteableYogaNodeProperties,
): value is Exclude<keyof WriteableYogaNodeProperties, "measureFunc"> {
  return value != "measureFunc";
}

function wrapMeasureFunc(func: MeasureFunction, precision: number): MeasureFunction {
  return (width, wMode, height, hMode) => {
    const result = func(width * precision, wMode, height * precision, hMode);
    return {
      width: Math.ceil(result.width / precision),
      height: Math.ceil(result.height / precision),
    };
  };
}

/**
 * @returns true if the property value was changed
 */
export function setYogaProperty<Name extends keyof WriteableYogaNodeProperties>(
  node: Node,
  precision: number,
  name: Name,
  value: WriteableYogaNodeProperties[Name],
  prevProperties: WriteableYogaNodeProperties,
): boolean {
  if (prevProperties[name] === value) {
    return false;
  }
  prevProperties[name] = value;
  if (isNotMeasureFunc(name)) {
    const propertyInfo = propertyMap[name];
    if (propertyInfo == null) {
      throw `unknown property "${name}"`;
    }
    const yogaValue = toYoga(precision, propertyInfo, name, value);
    if ("edge" in propertyInfo) {
      node[`set${propertyInfo.functionName}`](propertyInfo.edge, yogaValue);
      return true;
    }
    node[`set${propertyInfo.functionName}`](yogaValue);
    return true;
  }
  if (value == null) {
    (node as any).unsetMeasureFunc();
  } else {
    node.setMeasureFunc(wrapMeasureFunc(value as any, precision));
    node.markDirty();
  }
  return true;
}

export function getYogaProperty<Name extends keyof ReadableYogaNodeProperties>(
  node: Node,
  name: Name,
  precision: number,
): ReadableYogaNodeProperties[Name] {
  const propertyInfo = propertyMap[name];
  if (propertyInfo == null) {
    throw `unknown property "${name}"`;
  }
  let yogaResult: any;
  if ("edge" in propertyInfo) {
    yogaResult = node[`get${propertyInfo.functionName}`](propertyInfo.edge);
  } else {
    yogaResult = node[`get${propertyInfo.functionName}`]();
  }
  return fromYoga(precision, propertyInfo, name, yogaResult);
}

export function commitYogaChildren(node: Node, children: Array<Node>): void {
  let i = 0;

  let oldChildNode: Node | undefined;
  let correctChild: Node | undefined;
  while ((oldChildNode = node.getChild(i)) != null || (correctChild = children[i]) != null) {
    if (oldChildNode != null && correctChild != null && yogaNodeEqual(oldChildNode, correctChild)) {
      //unchanged
      ++i;
      continue;
    }

    if (oldChildNode != null) {
      node.removeChild(oldChildNode);
    }

    if (correctChild != null) {
      //insert
      correctChild!.getParent()?.removeChild(correctChild!);
      node.insertChild(correctChild!, i);
      ++i;
    }
  }
}

export function setYogaProperties(
  yoga: Node,
  precision: number,
  properties: WriteableYogaNodeProperties,
  prevProperties: WriteableYogaNodeProperties,
): boolean {
  const propertyEntries = Object.entries(properties);
  const prevPropertiesKeys = new Set(Object.keys(prevProperties));

  let changed = false;

  for (const [key, value] of propertyEntries) {
    if (setYogaProperty(yoga, precision, key as any, value, prevProperties)) {
      changed = true;
    }
    prevPropertiesKeys.delete(key);
  }

  //reset the previously set properties
  for (const key of prevPropertiesKeys) {
    setYogaProperty(yoga, precision, key as any, undefined, prevProperties);
    changed = true;
  }

  return changed;
}
