import { expect } from "chai"
import { FLEX_DIRECTION_COLUMN } from "yoga-layout-prebuilt"
import { FlexNode, YogaNodeProperties } from "./src"
import nodeDefaults from "./src/node-defaults"

const testValues: Omit<YogaNodeProperties, "measureFunc"> = {
    alignContent: "center",
    alignItems: "flexEnd",
    alignSelf: "spaceAround",
    aspectRatio: 2,
    borderBottom: 3,
    borderLeft: 4,
    borderRight: 5,
    borderTop: 6,
    display: "none",
    flexBasis: 7,
    flexDirection: "rowReverse",
    flexGrow: 8,
    flexShrink: 9,
    flexWrap: "wrapReverse",
    height: 10,
    justifyContent: "spaceEvenly",
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
}

const properties = Object.keys(testValues) as Array<keyof typeof testValues>

describe("set & get properties", () => {
    const node = new FlexNode()

    const rawValues: any = {}

    it("it should throw an error", () => {
        expect(() => node.getProperty(1, "measureFunc"), "can't get the measureFunc back").to.throw(
            `getProperty "measureFunc" is not possible`
        )

        expect(() => node.setProperty(1, "alignItems", "centerx" as any), "assign alignItems a unkown value").to.throw(
            `unkown value "centerx" for property "alignItems"`
        )

        expect(() => node.setProperty(1, "alignItemsy" as any, "centerx"), "set a unkown property").to.throw(
            `property "alignItemsy" is not exisiting`
        )

        expect(() => node.getComputed(0.01, "borderx" as any)).to.throw(`layout value "borderx" is not exisiting`)
    })

    //get raw vaues
    properties.forEach((property) => (rawValues[property] = flatten(node["getRawProperty"](property))))

    it("it should get the default values", () => {
        properties.forEach((property) =>
            expect(node.getProperty(1, property), `get default for ${property}`).to.equal(
                nodeDefaults[property as keyof typeof nodeDefaults]
            )
        )
    })

    it("it should set new values", () => {
        node.setProperty(1, "measureFunc", () => ({ width: 0, height: 0 }))
        ;(Object.entries(testValues) as Array<[keyof YogaNodeProperties, any]>).forEach(([name, value]) =>
            node.setProperty(1, name, value)
        )
        properties.forEach((property) =>
            expect(node.getProperty(1, property), `compare ${property} to expected value`).to.equal(
                testValues[property]
            )
        )
    })

    it("it should reset all values", () => {
        node.setProperty(1, "measureFunc", undefined)
        ;(Object.keys(testValues) as Array<keyof YogaNodeProperties>).forEach((name) =>
            node.setProperty(1, name, undefined)
        )
        properties.forEach(
            (property) =>
                expect(
                    equal(flatten(node["getRawProperty"](property)), rawValues[property]),
                    `compare ${property} to the default value`
                ).to.be.true
        )
    })
})

describe("add, remove & reorder children & layout", () => {
    const parent = new FlexNode()
    const child1 = new FlexNode()
    const child2 = new FlexNode()

    it("add children in order", () => {
        child1.index = 0
        child2.index = 1
        parent.insertChild(child2)
        parent.insertChild(child1)
        parent.commitChanges()
        child1.setProperty(0.01, "flexGrow", 1)
        child2.setProperty(0.01, "flexGrow", 1)
        //TODO:
        parent["node"].calculateLayout(100, 100, FLEX_DIRECTION_COLUMN)
        expect(child1.getComputed(0.01, "top"), "child 1 top").to.equal(0)
        expect(child1.getComputed(0.01, "height"), "child 1 height").to.equal(0.5)
        expect(child2.getComputed(0.01, "top"), "child 2 top").to.equal(0.5)
        expect(child2.getComputed(0.01, "height"), "child 2 height").to.equal(0.5)
    })

    it("change children order", () => {
        child1.index = 1
        child2.index = 0
        parent.commitChanges()
        //TODO:
        parent["node"].calculateLayout(100, 100, FLEX_DIRECTION_COLUMN)
        expect(child1.getComputed(0.01, "top"), "child 1 top").to.equal(0.5)
        expect(child1.getComputed(0.01, "height"), "child 1 height").to.equal(0.5)
        expect(child2.getComputed(0.01, "top"), "child 2 top").to.equal(0)
        expect(child2.getComputed(0.01, "height"), "child 2 height").to.equal(0.5)
    })

    it("change nothing", () => {
        parent.commitChanges()
        //TODO:
        parent["node"].calculateLayout(100, 100, FLEX_DIRECTION_COLUMN)
        expect(child1.getComputed(0.01, "top"), "child 1 top").to.equal(0.5)
        expect(child1.getComputed(0.01, "height"), "child 1 height").to.equal(0.5)
        expect(child2.getComputed(0.01, "top"), "child 2 top").to.equal(0)
        expect(child2.getComputed(0.01, "height"), "child 2 height").to.equal(0.5)
    })

    it("remove & destroy child", () => {
        parent.removeChild(child2)
        child2.destroy()
        parent.commitChanges()
        //TODO:
        parent["node"].calculateLayout(100, 100, FLEX_DIRECTION_COLUMN)
        expect(child1.getComputed(0.01, "top"), "child 1 top").to.equal(0)
        expect(child1.getComputed(0.01, "height"), "child 1 height").to.equal(1)
    })
})

function equal(val1: any, val2: any) {
    return val1 === val2 || (isNaN(val1) && isNaN(val2))
}

function flatten(val: any): any {
    if (typeof val === "object" && "value" in val) {
        return val.value
    }
    return val
}
