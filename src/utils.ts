import { MeasureFunction, Node } from "yoga-wasm-web";
import { setter } from "./setter.js";

export type YogaProperties = {
  [Key in keyof typeof setter]?: Parameters<typeof setter[Key]>[2];
};

export function yogaNodeEqual(n1: Node, n2: Node): boolean {
  return (n1 as any)["__nbindPtr"] === (n2 as any)["__nbindPtr"];
}

export function setMeasureFunc(node: Node, precision: number, func: MeasureFunction): void {
  node.setMeasureFunc((width, wMode, height, hMode) => {
    const result = func(width * precision, wMode, height * precision, hMode);
    return {
      width: Math.ceil(result.width / precision),
      height: Math.ceil(result.height / precision),
    };
  });
  node.markDirty();
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
