import { YogaNode, Node, YogaEdge } from "yoga-layout-prebuilt"
import { fromYoga, toYoga, propertyMap } from "."

type FilterGetComputed<T, Name extends keyof T> = Name extends `getComputed${infer PropertyName}`
    ? T[Name] extends (...args: Array<any>) => number
        ? PropertyName
        : never
    : never

export type GetEdgeParams<T> = T extends (...args: infer Params) => number
    ? Params extends []
        ? []
        : [edge: YogaEdge]
    : never

export type LayoutKeys = Uncapitalize<FilterGetComputed<YogaNode, keyof YogaNode>>

type PropertyMap = typeof propertyMap

export type YogaNodeProperties = {
    [Key in keyof PropertyMap]?: PropertyMap[Key] extends { type: "enum"; enumMap: object }
        ? keyof PropertyMap[Key]["enumMap"]
        :
              | number
              | (PropertyMap[Key] extends { autoUnit: true } ? "auto" : never)
              | (PropertyMap[Key] extends {
                    percentUnit: true
                }
                    ? `${number}%`
                    : never)
} & {
    measureFunc?: YogaNode["setMeasureFunc"] extends (args: infer Param) => any ? Param : never
}

export class FlexNode<T = unknown> {
    protected readonly node: YogaNode
    protected readonly children: Array<FlexNode> = []
    protected commitedChildren: Array<FlexNode> = []
    public index = 0

    constructor(protected readonly precision: number, public data: T) {
        this.node = Node.create()
    }

    destroy(): void {
        this.node.free()
    }

    private commitChildren(): void {
        const actualChildrenCount = this.node.getChildCount()
        this.children.sort((a, b) => a.index - b.index)
        for (let i = 0; i < Math.max(this.children.length, this.commitedChildren.length); i++) {
            const oldChild = this.commitedChildren[i]
            const correctChild = this.children[i]
            if (oldChild != correctChild) {
                if (correctChild != null) {
                    this.node.removeChild(correctChild.node)
                    this.node.insertChild(correctChild.node, i)
                } else if (i < actualChildrenCount) {
                    this.node.removeChild(this.node.getChild(i))
                }
            }
        }
        this.commitedChildren = [...this.children]
        this.commitedChildren.forEach((child) => child.commitChildren())
    }

    calculateLayout() {
        this.commitChildren()
        this.node.calculateLayout()
    }

    insertChild(node: FlexNode): void {
        this.children.push(node)
    }

    removeChild(node: FlexNode): void {
        const i = this.children.findIndex((n) => n === node)
        if (i != -1) {
            this.children.splice(i, 1)
        }
    }

    getComputed<Key extends LayoutKeys>(key: Key, ...params: GetEdgeParams<YogaNode[`getComputed${Capitalize<Key>}`]>) {
        const func: (...params: Array<any>) => any = this.node[`getComputed${capitalize(key)}`]
        if (func == null) {
            throw `layout value "${key}" is not exisiting`
        }
        return func.call(this.node, ...params) * this.precision
    }

    setProperty<Name extends keyof YogaNodeProperties>(name: Name, value: YogaNodeProperties[Name]): void {
        if (isMeasureFunc(name)) {
            const propertyInfo = propertyMap[name]
            if (propertyInfo == null) {
                throw `unkown property "${name}"`
            }
            this.callNodeFunction("set", propertyInfo, toYoga(this.precision, propertyInfo, name, value))
            return
        }
        if (value == null) {
            this.node.unsetMeasureFunc()
        } else {
            this.node.setMeasureFunc((width, wMode, height, hMode) =>
                (value as any)(width * this.precision, wMode, height * this.precision, hMode)
            )
        }
    }

    protected callNodeFunction<Prefix extends "get" | "set", Name extends keyof typeof propertyMap>(
        prefix: Prefix,
        propertyInformation: typeof propertyMap[Name],
        ...params: Array<any>
    ) {
        const func: (...params: Array<any>) => any = this.node[`${prefix}${propertyInformation.functionName}`]
        if ("edge" in propertyInformation) {
            return func.call(this.node, propertyInformation.edge, ...params)
        } else {
            return func.call(this.node, ...params)
        }
    }

    getProperty<Name extends Exclude<keyof YogaNodeProperties, "measureFunc">>(name: Name): YogaNodeProperties[Name] {
        const propertyInfo = propertyMap[name]
        if (propertyInfo == null) {
            throw `unkown property "${name}"`
        }
        return fromYoga(this.precision, propertyInfo, name, this.callNodeFunction("get", propertyInfo))
    }
}

function capitalize<Key extends string>(key: Key) {
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}` as Capitalize<Key>
}

function isMeasureFunc(value: keyof YogaNodeProperties): value is Exclude<keyof YogaNodeProperties, "measureFunc"> {
    return value != "measureFunc"
}
