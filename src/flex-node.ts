import { YogaNode, Node } from "yoga-layout-prebuilt"
import { edgeToConstant, RemoveEdge, retranslateEnum, translateEnums, YogaNodeProperties } from "."
import nodeDefaults from "./node-defaults"

const edgeRegex = /^(.+)(Top|Bottom|Left|Right)$/

export class FlexNode {
    private readonly node: YogaNode
    private readonly children: Set<FlexNode> = new Set([])
    public index: number | undefined

    constructor(private readonly onCalc: () => void) {
        this.node = Node.create()
    }

    destroy(): void {
        this.node.free()
    }

    commitChanges() {
        //TODO
        this.children.forEach((child) => {})
    }

    private onCalculated(): void {
        this.onCalc()
        this.children.forEach((child) => child.onCalc())
    }

    insertChild(node: FlexNode): void {
        this.children.add(node)
    }

    removeChild(node: FlexNode): void {
        this.children.delete(node)
    }

    setProperty<Name extends keyof YogaNodeProperties>(name: Name, value: YogaNodeProperties[Name]): void {
        if (value == null && name === "measureFunc") {
            this.node.unsetMeasureFunc()
            return
        }
        this.setRawProperty(
            name,
            value == null ? nodeDefaults[name as keyof typeof nodeDefaults] : translateEnums(name, value)
        )
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
            throw "getProperty 'measureFunc' is not possible"
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

    getProperty<Name extends keyof YogaNodeProperties>(name: Name): YogaNodeProperties[Name] {
        let value: YogaNodeProperties[Name] | { value: YogaNodeProperties[Name] } = this.getRawProperty(name)
        if (typeof value === "object") {
            if ("value" in value) {
                value = value.value
            } else {
                throw `unknown return value "${value}" for getting property "${name}"`
            }
        }
        if (typeof value === "number" && isNaN(value)) {
            return undefined
        }
        return retranslateEnum(name, value)
    }

    private getRawProperty = this.callNodeFunction.bind(this, "get")
}

function capitalize<Key extends string>(key: Key) {
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}` as Capitalize<Key>
}
