import { Condition, EvaluatedCondition } from "./condition/condition.model";
import { RuleEngine } from "./engine/engine";
import { Operator } from "./enums/operators";
import { RuleEvent } from "./event/event.model";
import { EvaluatedRule, Rule } from "./rule/rule.model";

export { Operator, RuleEngine, Rule, EvaluatedRule, Condition, EvaluatedCondition, RuleEvent }


const fact = { testId: 5 };
const rule: Rule = {
    name: 'test',
    conditions: {
        some: [
            {
                every: [
                    {
                        fact: 'testId',
                        operator: Operator.greaterThan,
                        value: 4
                    },
                    {
                        fact: 'testId',
                        operator: Operator.lessThan,
                        value: 6
                    }
                ]
            },
            {
                fact: 'asyncFact',
                operator: Operator.contains,
                value: 5
            },
        ]
    },
    priority: 5,
    event: {
        type: 'success',
        data: {
            msg: 'this is my message'
        }
    }
};

const firstRule: Rule = {
    name: 'first rule',
    conditions: {
        some: [
            {
                fact: 'testId',
                operator: Operator.lessThan,
                value: 50
            }
        ]
    },
    priority: 1,
    event: {
        type: 'success',
        data: {
            msg: 'this is my message from first rule'
        }
    }
}

const engine =
    new RuleEngine()
        .addFacts(fact)
        .addRules([rule, firstRule])
        .onEvent<{ msg: string }>('success', (e) => console.log(e.data?.msg))
        .addAsyncFact<number[] | undefined>('asyncFact', async (facts) => {
            const knownFact = await facts.getFact('testId');
            if(knownFact && knownFact === 5) {
                return new Promise(resolve => setTimeout(() => resolve([1,2,3,4,5]), 800));
            }
        })

engine.run().then(x => {
    console.log(x.results);
    console.log(x.factStore.getKnownFacts());
})