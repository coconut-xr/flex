import type { YogaNode, YogaEdge } from "yoga-layout-prebuilt";
import { fromYoga, toYoga, propertyMap } from "./index.js";

type FilterGetComputed<T, Name extends keyof T> = Name extends `getComputed${infer PropertyName}`
  ? T[Name] extends (...args: Array<any>) => number
    ? PropertyName
    : never
  : never;

export type GetEdgeParams<T> = T extends (...args: infer Params) => number
  ? Params extends []
    ? []
    : [edge: YogaEdge]
  : never;

export type LayoutKeys = Uncapitalize<FilterGetComputed<YogaNode, keyof YogaNode>>;

type PropertyMap = typeof propertyMap;

export type YogaNodeProperties = {
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
} & {
  measureFunc?: YogaNode["setMeasureFunc"] extends (args: infer Param) => any ? Param : never;
};

function yogaNodeEqual(n1: YogaNode, n2: YogaNode): boolean {
  return (n1 as any)["__nbindPtr"] === (n2 as any)["__nbindPtr"];
}

function isNotMeasureFunc(
  value: keyof YogaNodeProperties,
): value is Exclude<keyof YogaNodeProperties, "measureFunc"> {
  return value != "measureFunc";
}

type MeasureFunc = YogaNodeProperties["measureFunc"] extends infer Y | undefined ? Y : never;

function wrapMeasureFunc(func: MeasureFunc, precision: number): MeasureFunc {
  return (width, wMode, height, hMode) => {
    const result = func(width * precision, wMode, height * precision, hMode);
    if (result == null) {
      return null;
    }
    return {
      width: result.width == null ? undefined : Math.ceil(result.width / precision),
      height: result.height == null ? undefined : Math.ceil(result.height / precision),
    };
  };
}

export function setProperty<Name extends keyof YogaNodeProperties>(
  node: YogaNode,
  precision: number,
  name: Name,
  value: YogaNodeProperties[Name],
): void {
  if (isNotMeasureFunc(name)) {
    const propertyInfo = propertyMap[name];
    if (propertyInfo == null) {
      throw `unknown property "${name}"`;
    }
    callNodeFunction(node, "set", propertyInfo, toYoga(precision, propertyInfo, name, value));
    return;
  }
  if (value == null) {
    node.unsetMeasureFunc();
  } else {
    node.setMeasureFunc(wrapMeasureFunc(value as any, precision));
    node.markDirty();
  }
}

export function getProperty<Name extends Exclude<keyof YogaNodeProperties, "measureFunc">>(
  node: YogaNode,
  name: Name,
  precision: number,
): YogaNodeProperties[Name] {
  const propertyInfo = propertyMap[name];
  if (propertyInfo == null) {
    throw `unknown property "${name}"`;
  }
  return fromYoga(precision, propertyInfo, name, callNodeFunction(node, "get", propertyInfo));
}

export function callNodeFunction<
  Prefix extends "get" | "set",
  Name extends keyof typeof propertyMap,
>(
  node: YogaNode,
  prefix: Prefix,
  propertyInformation: typeof propertyMap[Name],
  ...params: Array<any>
) {
  const func: (...params: Array<any>) => any = node[`${prefix}${propertyInformation.functionName}`];
  if ("edge" in propertyInformation) {
    return func.call(node, propertyInformation.edge, ...params);
  } else {
    return func.call(node, ...params);
  }
}

export function commitChildren(children: Array<YogaNode>, node: YogaNode): void {
  let i = 0;

  let oldChildNode: YogaNode | undefined;
  let correctChild: YogaNode | undefined;
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

export function applyFlexProperties(
  yoga: YogaNode,
  precision: number,
  properties: YogaNodeProperties,
  prevProperties: YogaNodeProperties | undefined,
): boolean {
  const propertyEntries = Object.entries(properties);
  if (prevProperties == null) {
    for (const [key, value] of propertyEntries) {
      setProperty(yoga, precision, key as any, value);
    }
    return true;
  }
  const prevPropertiesKeys = new Set(Object.keys(prevProperties));

  let changed = false;

  for (const [key, value] of propertyEntries) {
    if (value != prevProperties[key as keyof YogaNodeProperties]) {
      setProperty(yoga, precision, key as any, value);
      changed = true;
    }
    prevPropertiesKeys.delete(key);
  }
  for (const key of prevPropertiesKeys) {
    setProperty(yoga, precision, key as any, undefined);
    changed = true;
  }

  return changed;
}
