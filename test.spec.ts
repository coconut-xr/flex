import { expect } from "chai";
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  ALIGN_SPACE_AROUND,
  DISPLAY_NONE,
  EDGE_BOTTOM,
  EDGE_LEFT,
  EDGE_RIGHT,
  FLEX_DIRECTION_ROW_REVERSE,
  JUSTIFY_SPACE_EVENLY,
  Node,
  OVERFLOW_SCROLL,
  POSITION_TYPE_ABSOLUTE,
  UNIT_PERCENT,
  UNIT_POINT,
  WRAP_WRAP_REVERSE,
} from "yoga-wasm-web";
import { EDGE_TOP } from "yoga-wasm-web";
import { loadYoga, setter } from "./src/index.js";
import { commitYogaChildren, setMeasureFunc, YogaProperties } from "./src/utils.js";

const testValues: YogaProperties = {
  alignContent: "center",
  alignItems: "flex-end",
  alignSelf: "space-around",
  aspectRatio: 2,
  borderBottom: 3,
  borderLeft: 4,
  borderRight: 5,
  borderTop: 6,
  display: "none",
  flexBasis: 7,
  flexDirection: "row-reverse",
  flexGrow: 8,
  flexShrink: 9,
  flexWrap: "wrap-reverse",
  height: 10,
  justifyContent: "space-evenly",
  marginBottom: 11,
  marginLeft: 12,
  marginRight: 13,
  marginTop: 14,
  maxHeight: 15,
  maxWidth: 16,
  minHeight: 17,
  minWidth: 18,
  overflow: "scroll",
  paddingBottom: 19,
  paddingLeft: 20,
  paddingRight: 21,
  paddingTop: 22,
  positionBottom: 23,
  positionLeft: 24,
  positionRight: 25,
  positionTop: 26,
  positionType: "absolute",
  width: "50%",
};

export const rawTestValues = {
  alignContent: ALIGN_CENTER,
  alignItems: ALIGN_FLEX_END,
  alignSelf: ALIGN_SPACE_AROUND,
  aspectRatio: 2,
  borderBottom: 3,
  borderLeft: 4,
  borderRight: 5,
  borderTop: 6,
  display: DISPLAY_NONE,
  flexBasis: 7,
  flexDirection: FLEX_DIRECTION_ROW_REVERSE,
  flexGrow: 8,
  flexShrink: 9,
  flexWrap: WRAP_WRAP_REVERSE,
  height: 10,
  justifyContent: JUSTIFY_SPACE_EVENLY,
  marginBottom: 11,
  marginLeft: 12,
  marginRight: 13,
  marginTop: 14,
  maxHeight: 15,
  maxWidth: 16,
  minHeight: 17,
  minWidth: 18,
  overflow: OVERFLOW_SCROLL,
  paddingBottom: 19,
  paddingLeft: 20,
  paddingRight: 21,
  paddingTop: 22,
  positionBottom: 23,
  positionLeft: 24,
  positionRight: 25,
  positionTop: 26,
  positionType: POSITION_TYPE_ABSOLUTE,
  width: 50, //50%
};

const properties = Object.keys(testValues) as Array<keyof typeof testValues>;

const propertiesWithEdge = ["border", "padding", "margin", "position"] as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getRawValue(property: string, node: Node): any {
  for (const propertyWithEdge of propertiesWithEdge) {
    if (property.startsWith(propertyWithEdge)) {
      if (property.endsWith("Top")) {
        return flatten(node[`get${capitalize(property.slice(0, -3))}` as "getBorder"](EDGE_TOP));
      }
      if (property.endsWith("Bottom")) {
        return flatten(node[`get${capitalize(property.slice(0, -6))}` as "getBorder"](EDGE_BOTTOM));
      }
      if (property.endsWith("Right")) {
        return flatten(node[`get${capitalize(property.slice(0, -5))}` as "getBorder"](EDGE_RIGHT));
      }
      if (property.endsWith("Left")) {
        return flatten(node[`get${capitalize(property.slice(0, -4))}` as "getBorder"](EDGE_LEFT));
      }
    }
  }
  return flatten(node[`get${capitalize(property)}` as "getWidth"]());
}

describe("set & get properties", () => {
  let yoga: any;
  let node: Node;

  const rawValues: any = {};

  before(async () => {
    yoga = await loadYoga().catch(console.error);
    node = yoga.Node.create();
  });

  it("it should throw an error", () => {
    expect(
      () => setter.alignItems(node, 1, "centerx" as any),
      "assign alignItems a unknown value",
    ).to.throw(
      `unexpected value centerx, expected auto, flex-start, center, flex-end, stretch, baseline, space-between, space-around`,
    );

    expect(
      () => setter.alignItems(node, 1, 1 as any),
      "assign alignItems a wrong value type",
    ).to.throw(
      `unexpected value 1, expected auto, flex-start, center, flex-end, stretch, baseline, space-between, space-around`,
    );
  });

  it("should get raw vaues", () => {
    properties.forEach((property) => {
      rawValues[property] = getRawValue(property, node);
    });
  });

  it("it should set new values", () => {
    (Object.entries(testValues) as Array<[keyof YogaProperties, any]>).forEach(([name, value]) =>
      setter[name](node, 1, value),
    );
    properties.forEach((property) =>
      expect(getRawValue(property, node), `compare ${property} to expected value`).to.equal(
        rawTestValues[property as any as keyof typeof rawTestValues],
      ),
    );
  });

  it("it should reset all values", () => {
    (Object.keys(testValues) as Array<keyof YogaProperties>).forEach((name) =>
      setter[name](node, 1, undefined),
    );
    properties.forEach((property) => {
      expect(
        equal(getRawValue(property, node), rawValues[property]),
        `compare ${property} to the default value`,
      ).to.be.true;
    });
  });

  it("it should set value with and without precision", () => {
    setter.width(node, 0.01, 1);
    expect(node.getWidth()).to.deep.equal({
      unit: UNIT_POINT,
      value: 100,
    });
    setter.width(node, 0.01, "50%");
    expect(node.getWidth()).to.deep.equal({
      unit: UNIT_PERCENT,
      value: 50,
    });
  });

  it("it should set and unset measure func", () => {
    expect(() => {
      setMeasureFunc(node, 0.01, () => ({ width: 0, height: 0 }));
      node.unsetMeasureFunc();
    }).to.not.throw();
  });
});

describe("add, remove & reorder children & layout", () => {
  let yoga: any;
  let parent: Node;
  let child1: Node;
  let child2: Node;
  let child3: Node;

  before(async () => {
    yoga = await loadYoga();
    parent = yoga.Node.create();
    child1 = yoga.Node.create();
    child2 = yoga.Node.create();
    child3 = yoga.Node.create();
  });

  it("add children in order", () => {
    commitYogaChildren(parent, [child1, child2]);

    setter.flexGrow(child1, 0.01, 1);
    setter.flexGrow(child2, 0.01, 1);
    setter.height(parent, 0.01, 1);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(child2.getComputedTop() * 0.01, "child 2 top").to.equal(0.5);
    expect(child2.getComputedHeight() * 0.01, "child 2 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(2);
  });

  it("change children order", () => {
    commitYogaChildren(parent, [child2, child1]);

    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0.5);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(child2.getComputedTop() * 0.01, "child 2 top").to.equal(0);
    expect(child2.getComputedHeight() * 0.01, "child 2 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(2);
  });

  it("change nothing", () => {
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0.5);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(child2.getComputedTop() * 0.01, "child 2 top").to.equal(0);
    expect(child2.getComputedHeight() * 0.01, "child 2 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(2);
  });

  it("remove child & destroy before commit", () => {
    commitYogaChildren(parent, [child1]);

    child2.free();
    setter.height(parent, 0.01, 2);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("remove child & destroy after commit", () => {
    commitYogaChildren(parent, [child1, child3]);
    parent.calculateLayout();

    commitYogaChildren(parent, [child1]);
    setter.height(parent, 0.01, 2);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
    child3.free();
  });

  it("use percentage", () => {
    setter.flexGrow(child1, 0.01, 0);
    setter.height(child1, 0.01, "25%");
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("use absolute value", () => {
    setter.height(child1, 0.01, 0.33);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.33);
    expect(parent.getChildCount()).to.equal(1);
  });
});

function equal(val1: any, val2: any) {
  return val1 === val2 || (isNaN(val1) && isNaN(val2));
}

function flatten(val: any): any {
  if (val == null) {
    return val;
  }
  if (typeof val === "object" && "value" in val) {
    return val.value;
  }
  return val;
}
