import { expect } from "chai";
import YogaPrebuilt from "yoga-layout-prebuilt";
import {
  propertyMap,
  fromYoga,
  YogaNodeProperties,
  setProperty,
  callNodeFunction,
  commitChildren,
  getProperty,
} from "./src/index.js";

const { Node } = YogaPrebuilt;

const testValues: Omit<YogaNodeProperties, "measureFunc"> = {
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
  const node = Node.create();

  const rawValues: any = {};

  it("it should throw an error", () => {
    expect(
      () => setProperty(node, 1, "alignItems", "centerx" as any),
      "assign alignItems a unknown value",
    ).to.throw(`unknown value "centerx" for property "alignItems"`);

    expect(
      () => setProperty(node, 1, "alignItems", 1 as any),
      "assign alignItems a wrong value type",
    ).to.throw(`"1" is not a valid value for "alignItems", expected a string`);

    expect(
      () => setProperty(node, 1, "alignItemsy" as any, "centerx"),
      "set a unknown property",
    ).to.throw(`unknown property "alignItemsy"`);

    expect(() => fromYoga(1, propertyMap["alignContent"], "test", {})).to.throw(
      `can't convert value "{}" for property "test" from yoga`,
    );

    expect(() => fromYoga(1, propertyMap["alignContent"], "alignContent", "abc")).to.throw(
      `can't retranslate value "abc" of property "alignContent"`,
    );

    expect(() => getProperty(node, "borderx" as any, 0.01)).to.throw(`unknown property "borderx"`);
  });

  //get raw vaues
  properties.forEach(
    (property) =>
      (rawValues[property] = flatten(callNodeFunction(node, "get", propertyMap[property]))),
  );

  it("it should set new values", () => {
    setProperty(node, 0.01, "measureFunc", () => ({ width: 0, height: 0 }));
    (Object.entries(testValues) as Array<[keyof YogaNodeProperties, any]>).forEach(
      ([name, value]) => setProperty(node, 0.01, name, value),
    );
    properties.forEach((property) =>
      expect(getProperty(node, property, 0.01), `compare ${property} to expected value`).to.equal(
        testValues[property],
      ),
    );
  });

  it("it should reset all values", () => {
    setProperty(node, 1, "measureFunc", undefined);
    (Object.keys(testValues) as Array<keyof YogaNodeProperties>).forEach((name) =>
      setProperty(node, 1, name, undefined),
    );
    properties.forEach(
      (property) =>
        expect(
          equal(flatten(callNodeFunction(node, "get", propertyMap[property])), rawValues[property]),
          `compare ${property} to the default value`,
        ).to.be.true,
    );
  });
});

describe("add, remove & reorder children & layout", () => {
  const parent = Node.create();
  const child1 = Node.create();
  const child2 = Node.create();
  const child3 = Node.create();

  it("add children in order", () => {
    commitChildren(parent, [child1, child2]);

    setProperty(child1, 0.01, "flexGrow", 1);
    setProperty(child2, 0.01, "flexGrow", 1);
    setProperty(parent, 0.01, "height", 1);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(child2.getComputedTop() * 0.01, "child 2 top").to.equal(0.5);
    expect(child2.getComputedHeight() * 0.01, "child 2 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(2);
  });

  it("change children order", () => {
    commitChildren(parent, [child2, child1]);

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
    commitChildren(parent, [child1]);

    child2.free();
    setProperty(parent, 0.01, "height", 2);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("remove child & destroy after commit", () => {
    commitChildren(parent, [child1, child3]);
    parent.calculateLayout();

    commitChildren(parent, [child1]);
    setProperty(parent, 0.01, "height", 2);
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(2);
    expect(parent.getChildCount()).to.equal(1);
    child3.free();
  });

  it("use percentage", () => {
    setProperty(child1, 0.01, "flexGrow", 0);
    setProperty(child1, 0.01, "height", "25%");
    parent.calculateLayout();
    expect(child1.getComputedTop() * 0.01, "child 1 top").to.equal(0);
    expect(child1.getComputedHeight() * 0.01, "child 1 height").to.equal(0.5);
    expect(parent.getChildCount()).to.equal(1);
  });

  it("use absolute value", () => {
    setProperty(child1, 0.01, "height", 0.33);
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
  if (typeof val === "object" && "value" in val) {
    return val.value;
  }
  return val;
}
