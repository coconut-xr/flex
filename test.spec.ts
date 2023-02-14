import { expect } from "chai";
import { Node } from "yoga-wasm-web";
import { propertyMap, fromYoga, loadYoga } from "./src/index.js";
import {
  commitYogaChildren,
  getYogaProperty,
  ReadableYogaNodeProperties,
  setYogaProperties,
  setYogaProperty,
  WriteableYogaNodeProperties,
} from "./src/utils.js";

const testValues: ReadableYogaNodeProperties = {
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

const properties = Object.keys(testValues) as Array<keyof typeof testValues>;

describe("set & get properties", () => {
  let yoga: any;
  let node: Node;
  const prevProperties: WriteableYogaNodeProperties = {}

  const rawValues: any = {};

  before(async () => {
    yoga = await loadYoga().catch(console.error);
    node = yoga.Node.create();
  });

  it("it should throw an error", () => {
    expect(
      () => setYogaProperty(node, 1, "alignItems", "centerx" as any, prevProperties),
      "assign alignItems a unknown value",
    ).to.throw(`unknown value "centerx" for property "alignItems"`);

    expect(
      () => setYogaProperty(node, 1, "alignItems", 1 as any, prevProperties),
      "assign alignItems a wrong value type",
    ).to.throw(`"1" is not a valid value for "alignItems", expected a string`);

    expect(
      () => setYogaProperty(node, 1, "alignItemsy" as any, "centerx", prevProperties),
      "set a unknown property",
    ).to.throw(`unknown property "alignItemsy"`);

    expect(() => fromYoga(1, propertyMap["alignContent"], "test", {})).to.throw(
      `can't convert value "{}" for property "test" from yoga`,
    );

    expect(() => fromYoga(1, propertyMap["alignContent"], "alignContent", "abc")).to.throw(
      `can't retranslate value "abc" of property "alignContent"`,
    );

    expect(() => getYogaProperty(node, "borderx" as any, 0.01)).to.throw(
      `unknown property "borderx"`,
    );
  });

  it("should get raw vaues", () => {
    properties.forEach((property) => {
      const propertyInfo = propertyMap[property];
      let rawValue: any;
      if ("edge" in propertyInfo) {
        rawValue = node[`get${propertyInfo.functionName}`](propertyInfo.edge);
      } else {
        rawValue = node[`get${propertyInfo.functionName}`]();
      }
      rawValues[property] = flatten(rawValue);
    });
  });

  it("it should set new values", () => {
    setYogaProperty(node, 0.01, "measureFunc", () => ({ width: 0, height: 0 }), prevProperties);
    (Object.entries(testValues) as Array<[keyof ReadableYogaNodeProperties, any]>).forEach(
      ([name, value]) => setYogaProperty(node, 0.01, name, value, prevProperties),
    );
    properties.forEach((property) =>
      expect(
        getYogaProperty(node, property, 0.01),
        `compare ${property} to expected value`,
      ).to.equal(testValues[property]),
    );
  });

  it("it should reset all values", () => {
    setYogaProperty(node, 1, "measureFunc", undefined, prevProperties);
    (Object.keys(testValues) as Array<keyof ReadableYogaNodeProperties>).forEach((name) =>
      setYogaProperty(node, 1, name, undefined, prevProperties),
    );
    properties.forEach((property) => {
      const propertyInfo = propertyMap[property];
      let rawValue: any;
      if ("edge" in propertyInfo) {
        rawValue = node[`get${propertyInfo.functionName}`](propertyInfo.edge);
      } else {
        rawValue = node[`get${propertyInfo.functionName}`]();
      }
      expect(
        equal(flatten(rawValue), rawValues[property]),
        `compare ${property} to the default value`,
      ).to.be.true;
    });
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

    setYogaProperty(child1, 0.01, "flexGrow", 1, {});
    setYogaProperty(child2, 0.01, "flexGrow", 1, {});
    setYogaProperty(parent, 0.01, "height", 1, {});
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
    setYogaProperty(parent, 0.01, "height", 2, {});
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("remove child & destroy after commit", () => {
    commitYogaChildren(parent, [child1, child3]);
    parent.calculateLayout();

    commitYogaChildren(parent, [child1]);
    setYogaProperty(parent, 0.01, "height", 2, {});
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
    child3.free();
  });

  it("use percentage", () => {
    setYogaProperty(child1, 0.01, "flexGrow", 0, {});
    setYogaProperty(child1, 0.01, "height", "25%", {});
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("use absolute value", () => {
    setYogaProperty(child1, 0.01, "height", 0.33, {});
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.33);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("should not change anything when depending on previously set properties", () => {
    expect(setYogaProperty(child1, 0.01, "height", 0.33, { height: 0.33 })).to.be.false;
    expect(setYogaProperty(child1, 0.01, "height", 0.1, { height: 0.33 })).to.be.true;
    expect(setYogaProperties(child1, 0.01, { height: 0.33 }, { height: 0.33 })).to.be.false;
    expect(setYogaProperties(child1, 0.01, {}, { height: 0.33 })).to.be.true;
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
