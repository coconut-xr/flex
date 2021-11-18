import { YogaNode, Node, YogaEdge } from "yoga-layout-prebuilt"
import { edgeToConstant, fromYoga, RemoveEdge, toYoga, YogaNodeProperties } from "."

const edgeRegex = /^(.+)(Top|Bottom|Left|Right)$/

type FilterGetComputed<T, Name extends keyof T> = Name extends `getComputed${infer PropertyName}`
    ? T[Name] extends (...args: Array<any>) => number
        ? PropertyName
        : never
    : never

export type GetParams<T, Key extends keyof T> = T[Key] extends (...args: infer Params) => number
    ? Params extends []
        ? []
        : [edge: YogaEdge]
    : never

export type LayoutKeys = Uncapitalize<FilterGetComputed<YogaNode, keyof YogaNode>>

export class FlexNode {
    private readonly node: YogaNode
    private readonly children: Array<FlexNode> = []
    public index: number = 0

    constructor() {
        this.node = Node.create()
    }

    destroy(): void {
        this.node.free()
    }

    commitChanges() {
        this.children.sort((a, b) => a.index - b.index)
        for (let i = 0; i < this.children.length; i++) {
            const oldChild = this.node.getChild(i)
            const correctChild = this.children[i].node
            if (oldChild != correctChild) {
                console.log("change " + i) //TODO: this is called even when nothing has changed???
                if (oldChild != null) {
                    this.node.removeChild(oldChild)
                }
                this.node.removeChild(correctChild)
                this.node.insertChild(correctChild, i)
            }
        }
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

    getComputed<Key extends LayoutKeys>(
        precision: number,
        key: Key,
        ...params: GetParams<YogaNode, `getComputed${Capitalize<Key>}`>
    ) {
        const func: Function = this.node[`getComputed${capitalize(key)}`]
        if (func == null) {
            throw `layout value "${key}" is not exisiting`
        }
        return func.call(this.node, ...params) * precision
    }

    setProperty<Name extends keyof YogaNodeProperties>(
        precision: number,
        name: Name,
        value: YogaNodeProperties[Name]
    ): void {
        if (value == null && name === "measureFunc") {
            this.node.unsetMeasureFunc()
            return
        }
        this.setRawProperty(name, toYoga(precision, name, value))
    }

    private callNodeFunction<Prefix extends "get" | "set", Name extends keyof YogaNodeProperties>(
        prefix: Prefix,
        name: Name,
        ...params: Array<any>
    ) {
        const edgeMatch = edgeRegex.exec(name)
        const key = (edgeMatch == null ? name : edgeMatch[1]) as RemoveEdge<Name>
        const edgeProperties = edgeMatch == null ? [] : [edgeToConstant[edgeMatch[2] as keyof typeof edgeToConstant]]
        if (key == "measureFunc" && prefix === "get") {
            throw `getProperty "measureFunc" is not possible`
        }
        const fnName: `${Prefix}${Capitalize<Exclude<RemoveEdge<Name>, "measureFunc">>}` = `${prefix}${capitalize(
            key as Exclude<typeof key, "measureFunc">
        )}`
        const func: Function = this.node[fnName]
        if (func == null) {
            throw `property "${name}" is not exisiting`
        }
        return func.call(this.node, ...(edgeProperties as []), ...params)
    }

    private setRawProperty = this.callNodeFunction.bind(this, "set")

    getProperty<Name extends keyof YogaNodeProperties>(precision: number, name: Name): YogaNodeProperties[Name] {
        return fromYoga(precision, name, this.getRawProperty(name))
    }

    private getRawProperty = this.callNodeFunction.bind(this, "get")
}

function capitalize<Key extends string>(key: Key) {
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}` as Capitalize<Key>
}
