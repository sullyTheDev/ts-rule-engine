import { Condition, EvaluatedCondition } from "../condition/condition.model";
import { Operator } from "../enums/operators";
import { RuleEvent } from "../event/event.model";
import { EvaluatedRule, Rule } from "../rule/rule.model";

type AsyncFactObject = {[key: string]: AsyncFactGetter<unknown>};
type AsyncFactGetter<R> = (facts: FactStore) => Promise<R>;
type FactObject = {[key: string]: unknown};
type RuleEventHandler<T> = (e: RuleEvent<T>, factStore: FactStore, evaluatedRule: EvaluatedRule) => void
export class RuleEngine {
    private rules: Rule[] = [];
    private eventHandlers: {key: string, handler: RuleEventHandler<unknown>}[] = [];
    private facts: FactObject = {};
    private factStore!: FactStore;
    private asyncFacts: AsyncFactObject = {};

    public addAsyncFact<T>(key: string, getter: AsyncFactGetter<T>): RuleEngine {
        this.asyncFacts[key] = getter;
        return this;
    }

    public addAsyncFacts(asyncFacts: AsyncFactObject): RuleEngine {
        Object.keys(asyncFacts).forEach(x => {
            this.asyncFacts[x] = asyncFacts[x];
        });
        return this;
    }

    public addFacts<T>(facts: FactObject): RuleEngine {
        Object.keys(facts).forEach(x => {
            this.facts[x] = facts[x];
        });
        return this;
    }

    public addFact<T>(key: string, value: T): RuleEngine {
        this.facts[key] = value;
        return this;
    }

    public addRule(rule: Rule): RuleEngine {
        this.rules.push(rule);
        return this;
    }

    public addRules(rules: Rule[]): RuleEngine {
        rules.forEach(rule => {
            this.rules.push(rule);
        });
        return this;
    }

    public onEvent<T>(key: string, handler: RuleEventHandler<T>): RuleEngine {
        this.eventHandlers.push({key, handler: (handler as RuleEventHandler<unknown>)});
        return this;
    }

    public async run(): Promise<{results: EvaluatedRule[], factStore:FactStore }> {
        this.factStore = new FactStore(this.facts, this.asyncFacts);
        const evaledRules = await Promise.all(this.rules.sort((a, b) => (a?.priority ?? 0) - (b?.priority ?? 0)).map(async (x) => {
            console.log(x.name);
            const evaledCondition = await this.evaluateCondition(x.conditions, this.factStore);
            const evaledRule = {...x, conditions: evaledCondition, result: evaledCondition.result} as EvaluatedRule;
            if(evaledRule.event && evaledRule.result) {
                this.triggerEvent(evaledRule);
            }
            return evaledRule;
        }));

        return {results: evaledRules, factStore: this.factStore};
    }

    private triggerEvent(evaluatedRule: EvaluatedRule) {
        this.eventHandlers.filter(x => x.key === evaluatedRule?.event?.type).forEach(x => x.handler((evaluatedRule?.event as RuleEvent<unknown>), this.factStore, evaluatedRule));
    }
    private async evaluateCondition(condition: Condition<unknown>, factStore: FactStore): Promise<EvaluatedCondition<unknown>> {
        if(condition.every?.length) {
            const evaldConditions = await Promise.all(condition.every.map(x => {
                return this.evaluateCondition(x, factStore);
            }));

            return {...condition, every: evaldConditions, result: evaldConditions.every(x => x.result)} as EvaluatedCondition<unknown>;
        } 
        if(condition.some?.length) {
            const evaldConditions = await Promise.all(condition.some.map(x => {
                return this.evaluateCondition(x, factStore);
            }));
            return {...condition, some: evaldConditions, result: evaldConditions.some(x => x.result)} as EvaluatedCondition<unknown>;
        } 
        
        if(condition.not?.length) {
            const evaldConditions = await Promise.all(condition.not.map(x => {
                return this.evaluateCondition(x, factStore);
            }));
            return {...condition, not: evaldConditions, result: !evaldConditions.some(x => x.result)} as EvaluatedCondition<unknown>;
        }

        // not a group so single condition operations below
        if(!condition.fact) {
            throw new Error('Bottom level conditions need a fact key provided to them. Please provide the property key of the fact you are operating on.');
        }
        const factValue = await factStore.getFact(condition.fact);
        return Promise.resolve({...condition, result: this.evaluateBaseCondition(factValue, condition)} as EvaluatedCondition<unknown>);
    }

    private evaluateBaseCondition(factValue: unknown, condition: Condition<unknown>): boolean {
        switch (condition.operator) {
            case Operator.contains:
                if(Array.isArray(factValue)) {
                    return factValue.some(x => x === condition.value);
                } else {
                    throw new Error('Tried performing contains operation on non-array type')
                }
                break;
            case Operator.notContains:
                if(Array.isArray(factValue)) {
                    return !factValue.some(x => x === condition.value);
                } else {
                    throw new Error('Tried performing not contains operation on non-array type')
                }
                break;
            case Operator.in:
                if(Array.isArray(condition.value)) {
                    return condition.value.some(x => x === factValue);
                } else {
                    throw new Error('Tried performing in operation on non-array type')
                }
                break;
            case Operator.notIn:
                if(Array.isArray(condition.value)) {
                    return !condition.value.some(x => x === factValue);
                } else {
                    throw new Error('Tried performing in operation on non-array type')
                }
                break;
            case Operator.equal:
                return JSON.stringify(factValue) === JSON.stringify(condition);
                break;
            case Operator.notEqual:
                return JSON.stringify(factValue) != JSON.stringify(condition);
                break;
            case Operator.greaterThan:
                if(!isNaN(factValue as number) && !isNaN(condition.value as number)) {
                    return (factValue as number) > (condition.value as number);
                } else {
                    throw new Error('Tried performing greater than operation on non-number types')
                }
                break;
            case Operator.greaterThanInclusive:
                if(!isNaN(factValue as number) && !isNaN(condition.value as number)) {
                    return (factValue as number) >= (condition.value as number);
                } else {
                    throw new Error('Tried performing greater than inclusive operation on non-number types')
                }
                break;
            case Operator.lessThan:
                if(!isNaN(factValue as number) && !isNaN(condition.value as number)) {
                    return (factValue as number) < (condition.value as number);
                } else {
                    throw new Error('Tried performing less than operation on non-number types')
                }
                break;
            case Operator.lessThanInclusive:
                if(!isNaN(factValue as number) && !isNaN(condition.value as number)) {
                    return (factValue as number) <= (condition.value as number);
                } else {
                    throw new Error('Tried performing less than inclusive operation on non-number types')
                }
                break;
            default:
                console.warn('operation not supported, return true');
                return true;
                break;
        }
    }

}

export class FactStore {
    constructor(private facts: FactObject, private asyncFacts: AsyncFactObject) {

    }

    async getFact<T>(key: string): Promise<T | undefined> {
        if(this.facts[key]) {
            return Promise.resolve(this.facts[key] as T)
        }
        if(this.asyncFacts[key]) {
            console.log('getting async fact');
            const value = await this.asyncFacts[key](this);
            this.addRuntimeFact(key, value);
            return Promise.resolve(value as T)
        }
        return Promise.resolve(undefined)
    }

    getKnownFacts() {
        return this.facts;
    }

    addRuntimeFact<T>(key: string, value: T): void {
        this.facts[key] = value;
    }
}