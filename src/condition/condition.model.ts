import { Operator } from "../enums/operators";

export interface Condition<T> {
    some?: Condition<unknown>[],
    every?: Condition<unknown>[],
    not?: Condition<unknown>[],
    fact?: string,
    operator?: Operator,
    value?: T
}

export interface EvaluatedCondition<T> {
    factValue?: T,
    result: boolean
    some?: EvaluatedCondition<unknown>[],
    every?: EvaluatedCondition<unknown>[],
    not?: EvaluatedCondition<unknown>[],
    fact?: string,
    operator?: Operator,
    value?: T
}