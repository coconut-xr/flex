import { expect } from "chai"
import { FlexNode, fromYoga, YogaNodeProperties } from "./src"
import nodeDefaults from "./src/node-defaults"

const properties = Object.keys(nodeDefaults) as Array<keyof typeof nodeDefaults>

const testValues: YogaNodeProperties = {
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
    measureFunc: () => ({ width: 0, height: 0 }),
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
    width: 27,
}

describe("set & get properties", () => {
    const node = new FlexNode()

    it("it should get the raw default values", () => {
        properties.forEach(
            (property) => expect(equal(flatten(node["getRawProperty"](property)), nodeDefaults[property])).to.be.true
        )
    })

    it("it should get the simplified default values", () => {
        properties.forEach((property) =>
            expect(node.getProperty(1, property)).to.deep.equal(fromYoga(1, property, nodeDefaults[property]))
        )
    })

    it("it should set new values", () => {
        ;(Object.entries(testValues) as Array<[keyof YogaNodeProperties, any]>).forEach(([name, value]) =>
            node.setProperty(1, name, value)
        )
        properties.forEach((property) => expect(node.getProperty(1, property)).to.equal(testValues[property]))
    })

    it("it should reset all values", () => {
        ;(Object.keys(testValues) as Array<keyof YogaNodeProperties>).forEach((name) =>
            node.setProperty(1, name, undefined)
        )
        properties.forEach(
            (property) => expect(equal(flatten(node["getRawProperty"](property)), nodeDefaults[property])).to.be.true
        )
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
