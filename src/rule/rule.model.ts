import { Condition, EvaluatedCondition } from "../condition/condition.model";
import { RuleEvent } from "../event/event.model";

export interface Rule {
    name?: string,
    conditions: Condition<unknown>,
    event?: RuleEvent<unknown>,
    priority?: number
}

export interface EvaluatedRule {
    result: boolean,
    name?: string,
    conditions: EvaluatedCondition<unknown>,
    event?: RuleEvent<unknown>,
    priority?: number
}