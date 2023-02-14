import { fromYoga, toYoga } from "./index.js"
import { propertyMap } from "./property-map.js"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import type { Node } from "yoga-wasm-web"

export type MeasureFunction = (
    width: number,
    widthMode: number,
    height: number,
    heightMode: number
) => { width: number; height: number }

export type PropertyMap = typeof propertyMap

export type ComputedPropertyMap = {
    [Key in keyof PropertyMap as PropertyMap[Key] extends { computed: true } ? Key : never]: PropertyMap[Key]
}

export type ManualPropertyMap = {
    [Key in keyof PropertyMap as PropertyMap[Key] extends { manual: true } ? Key : never]: PropertyMap[Key]
}

export type YogaNodeProperties = {
    [Key in keyof ManualPropertyMap]?: ManualPropertyMap[Key] extends { type: "enum"; enumMap: object }
        ? keyof ManualPropertyMap[Key]["enumMap"]
        :
              | number
              | (ManualPropertyMap[Key] extends { autoUnit: true } ? "auto" : never)
              | (ManualPropertyMap[Key] extends {
                    percentUnit: true
                }
                    ? `${number}%`
                    : never)
} & {
    measureFunc?: MeasureFunction
}

export class FlexNode {
    protected readonly node: Node
    protected readonly children: Array<this> = []
    public index = 0
    private shouldBeDestroyed = false

    constructor(yoga: any, protected readonly precision: number) {
        this.node = yoga.Node.create()
    }

    destroy(): void {
        this.shouldBeDestroyed = true
    }

    private commitChildren(): void {
        this.children.sort((a, b) => a.index - b.index)

        let i = 0

        let oldChildNode: Node | undefined
        let correctChild: this | undefined
        while ((oldChildNode = this.node.getChild(i)) != null || (correctChild = this.children[i]) != null) {
            if (oldChildNode != null && correctChild != null && yogaNodeEqual(oldChildNode, correctChild.node)) {
                //unchanged
                ++i
                continue
            }

            if (oldChildNode != null) {
                this.node.removeChild(oldChildNode)
            }

            if (correctChild != null) {
                //insert
                correctChild!.node.getParent()?.removeChild(correctChild!.node)
                this.node.insertChild(correctChild!.node, i)
                ++i
            }
        }

        this.children.forEach((child) => child.commitChildren())
        if (this.shouldBeDestroyed) {
            this.node.free()
        }
    }

    calculateLayout() {
        this.commitChildren()
        this.node.calculateLayout()
    }

    insertChild(node: this): void {
        this.children.push(node)
    }

    removeChild(node: this): void {
        const i = this.children.findIndex((n) => n === node)
        if (i != -1) {
            this.children.splice(i, 1)
        }
    }

    getComputed<Key extends keyof ComputedPropertyMap>(name: Key) {
        const propertyInfo = propertyMap[name]
        if (propertyInfo == null) {
            throw `unkown property "${name}"`
        }
        if ("edge" in propertyInfo) {
            return this.node[`getComputed${propertyInfo.functionName}`](propertyInfo.edge) * this.precision
        }
        return fromYoga(this.precision, propertyInfo, name, this.node[`getComputed${propertyInfo.functionName}`]())
    }

    setProperty<Name extends keyof YogaNodeProperties>(name: Name, value: YogaNodeProperties[Name]): void {
        if (isMeasureFunc(name)) {
            //unsert
            if (value == null) {
                (this.node as any).unsetMeasureFunc()
                return
            }

            //set
            this.node.setMeasureFunc(wrapMeasureFunc(value as any, this.precision))
            this.node.markDirty()
            return
        }

        const propertyInfo = propertyMap[name as keyof ManualPropertyMap]
        if (propertyInfo == null) {
            throw `unkown property "${name}"`
        }
        const yogaValue = toYoga(this.precision, propertyInfo, name, value)
        if ("edge" in propertyInfo) {
            this.node[`set${propertyInfo.functionName}`].call<Node, [0 | 1 | 2 | 3, any], void>(
                this.node,
                propertyInfo.edge,
                yogaValue
            )
        } else {
            this.node[`set${propertyInfo.functionName}`].call<Node, [any], void>(this.node, yogaValue)
        }
    }

    getProperty<Name extends Exclude<keyof YogaNodeProperties, "measureFunc">>(name: Name): YogaNodeProperties[Name] {
        const propertyInfo = propertyMap[name]
        if (propertyInfo == null) {
            throw `unkown property "${name}"`
        }
        let response: any
        if ("edge" in propertyInfo) {
            response = this.node[`get${propertyInfo.functionName}`].call<Node, [0 | 1 | 2 | 3], any>(
                this.node,
                propertyInfo.edge
            )
        } else {
            response = this.node[`get${propertyInfo.functionName}`].call<Node, [], any>(this.node)
        }
        return fromYoga(this.precision, propertyInfo, name, response)
    }
}

function yogaNodeEqual(n1: Node, n2: Node): boolean {
    return (n1 as any)["__nbindPtr"] === (n2 as any)["__nbindPtr"]
}

function isMeasureFunc(value: keyof YogaNodeProperties): value is "measureFunc" {
    return value === "measureFunc"
}

function wrapMeasureFunc(func: MeasureFunction, precision: number): MeasureFunction {
    return (width, wMode, height, hMode) => {
        const result = func(width * precision, wMode, height * precision, hMode)
        return {
            width: Math.ceil(result.width / precision),
            height: Math.ceil(result.height / precision),
        }
    }
}
