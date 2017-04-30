import assert from 'assert'
import {parse, print} from 'math-parser'

import * as nodes from '../lib/nodes'
import {
    matchNode,
    match,
    rewrite,
    defineRule,
    canApplyRule,
    applyRule,
    populatePattern,
} from '../lib/matcher'


// returns the rewritten string
const rewriteString = (matchPattern, rewritePattern, input) => {
    const rule = defineRuleString(matchPattern, rewritePattern)
    const ast = rewrite(rule, parse(input))
    return print(ast)
}

// returns the matched node in the AST of the parsed input
const matchString = (pattern, input) => {
    return match(parse(pattern), parse(input))
}

const defineRuleString = (matchPattern, rewritePattern, constraints) => {
    return defineRule(
        parse(matchPattern),
        isFunction(rewritePattern)
            ? rewritePattern
            : parse(rewritePattern),
        constraints)
}

const canApplyRuleString = (rule, input) => canApplyRule(rule, parse(input))

const applyRuleString = (rule, input) => print(applyRule(rule, parse(input)))

const populatePatternString = (pattern, placeholders) => populatePattern(parse(pattern), placeholders)

const isNeg = node => node.type === 'Apply' && node.op === 'neg'
const isFunction = (val) => typeof val === 'function'
const isNumber = node => {
    if (node.type === 'Number') {
        return true
    } else if (isNeg(node)) {
        return isNumber(node.args[0])
    } else {
        return false
    }
}
const isIdentifier = node => node.type === 'Identifier'

const getValue = node => {
    if (node.type === 'Number') {
        return parseFloat(node.value)
    } else if (isNeg(node)) {
        return -getValue(node.args[0])
    }
}
const isAdd = node => node && node.type === 'Apply' && node.op === 'add'

describe('matcher', () => {
    describe('matchNode', () => {
        it('should return true when the expressions are equal', () => {
            const ast1 = parse('1 + 2')
            const ast2 = parse(' 1  +  2')

            assert(matchNode(ast1, ast2))
        })

        it('should return true for sub-expressions in add and mul nodes', () => {
            assert(matchNode(parse('1 + 2'), parse('1 + 2 + 3')))
            assert(matchNode(parse('1 * 2'), parse('1 * 2 * 3')))
        })
    })

    describe('match', () => {
        it('should return false for sub-expressions not in add and mul nodes', () => {
            assert.equal(matchNode(parse('4 + 5'), parse('1 + 2 + 3')), null)
            assert.equal(matchNode(parse('4 * 5'), parse('1 * 2 * 3')), null)
        })

        it('should find a match for a sub-expression pattern in add and mul nodes', () => {
            assert(matchString('#a + #b', '1 + 2 + 3'))
            assert(matchString('#a * #b', '1 * 2 * 3'))
        })

        it('should find not find a match', () => {
            assert.equal(matchString('#a + #a', '1 + 2'), null)
        })

        it('should find match equal nodes', () => {
            assert(matchString('#a + #a', '1 + 1'))
        })

        it('should find match complex equal nodes', () => {
            assert(matchString('#a + #a', '1/a + 1/a'))
        })

        it('should find a match inside sub-expressions', () => {
            assert(matchString('#a + #b', '3 * (1 + 2)'))
        })

        it('should find match different complex expressions', () => {
            const result = matchString('#a + #b', '2 * a + 3 * b ^ 2')
            assert(result)
            const { node } = result
            assert(matchNode(node.args[0], parse('2 * a')))
            assert(matchNode(node.args[1], parse('3 * b ^ 2')))
        })

        it('should match patterns including constants', () => {
            assert(matchString('0 + #a', '0 + -5'))
            assert(matchString('#a + 0', '23 + 0'))
        })

        it('should match patterns including identifiers', () => {
            assert(matchString('#a x', '3 x'))
            assert(matchString('#a x + #b x', '3 x + 5 x'))
            assert.equal(matchString('#a x + #b x', '3 x + 5 y'), null)
        })
    })

    describe('rewrite', () => {
        it('should replace x + 0', () => {
            const result = rewriteString('#a + 0', '#a', '2 * (x + 0)')
            assert.equal(result, '2 * x')
        })

        it('should replace x + 0 as a subexpression', () => {
            const result = rewriteString('#a + 0', '#a', '2 * (x + 0)')
            assert.equal(result, '2 * x')
        })

        it('should replace the innermost x + 0', () => {
            const result = rewriteString('#a + 0', '#a', '(x + 0) + 0')
            assert.equal(result, 'x + 0')
        })

        it('should replace x + 0 within a large expression', () => {
            const result = rewriteString('#a + 0', '#a', '1 + x + 0 + 2')
            assert.equal(result, '1 + x + 2')
        })

        it('should replace an single node with an add operation', () => {
            const result = rewriteString('2 #a', '#a + #a', '1 + 2 x + 2')
            assert.equal(result, '1 + (x + x) + 2')
        })

        it('should replace an single node with a mul operation', () => {
            const result = rewriteString('2 #a', '#a + #a', '1 * 2 x * 3')
            assert.equal(result, '1 * (x + x) * 3')
        })

        it('should work from the inside out', () => {
            const result = rewriteString('#a + 0', '#a', '((x + 0) + 0) + 0')
            assert.equal(result, '(x + 0) + 0')
        })

        it('should apply the rule a single time', () => {
            const result = rewriteString('#a + 0', '#a', '(x + 0) + (x + 0)')
            assert.equal(result, 'x + (x + 0)')

            const result2 = rewriteString('#a + 0', '#a', 'x + 0 + x + 0')
            assert.equal(result2, 'x + x + 0')
        })
    })

    describe('canApplyRule', () => {
        it('should accept applicable rules', () => {
            const rule = defineRuleString('#a + #a', '2 #a')
            assert(canApplyRuleString(rule, 'x + x'))
        })

        it('should reject unapplicable rules', () => {
            const rule = defineRuleString('#a + #a', '2 #a')
            assert.equal(canApplyRuleString(rule, 'x + y'), false)
        })

        it('should accept applicable rules based on constraints', () => {
            const rule = defineRuleString('#a + #a', '2 * #a', { a: isNumber })
            assert(canApplyRuleString(rule, '3 + 3'))
        })

        it('should reject unapplicable rules based on constraints', () => {
            const rule = defineRuleString('#a + #a', '2 #a', { a: isNumber })
            assert.equal(canApplyRuleString(rule, 'x + x'), false)
        })
    })

    describe('applyRule', () => {
        it('should apply applicable rules', () => {
            const rule = defineRuleString('#a + #a', '2 #a')
            assert.equal(applyRuleString(rule, 'x + x'), '2 x')
        })

        it('should apply applicable rules based on constraints', () => {
            const rule = defineRuleString('#a #x + #b #x', '(#a + #b) #x', {
                a: isNumber,
                b: isNumber,
            })
            assert.equal(applyRuleString(rule, '2 x + 3 x'), '(2 + 3) x')
            assert.equal(canApplyRuleString(rule, '(a + b) x'), false)
        })

        it('should apply rules with a rewrite callback', () => {
            const rule = defineRuleString(
                '#a #b',
                ({a, b}) => nodes.applyNode(
                    'add',
                    b.args.map(arg => populatePatternString('#a #arg', {a, arg}))
                ),
                {b: isAdd})

            assert.equal(
                applyRuleString(rule, '3 (x + 1)'),
                '3 x + 3 1')

            assert.equal(
                applyRuleString(rule, '(a - b) (x^2 + 2x + 1)'),
                '(a - b) x^2 + (a - b) 2 x + (a - b) 1')
        })

        it('should evaluate sums of numbers', () => {
            const rule = defineRuleString(
                '#a',
                // TODO: use evaluate from node-parser
                // TODO: add a special 'eval' node so that we do '#eval(#a)'
                ({a}) => nodes.numberNode(
                    a.args.reduce((total, arg) => total + getValue(arg), 0)),
                {
                    a: (a) => isAdd(a) && a.args.every(isNumber)
                },
            )

            assert.equal(applyRuleString(rule, '(1 - 2 + 3) x'), '2 x')
            assert.equal(applyRuleString(rule, '(1 + 2 + 3) x'), '6 x')
        })

        // collect like terms: x + 5 + 2x - 3
        // should be able to collect the x's and numbers even though they aren't
        // adjacent.  We need to determine:
        // - coefficients
        // - factors
        // - determine which sets of factors are equivalent, e.g. x, y === y, x

        // TODO(kevinb) figure out how to formulate this as a rule
        it('should add numeric exponents', () => {

            const input = '2x + 7y + 5 + 3y + 9x + 11'
            const ast = parse(input)

            // matchNode matches the current node
            // matchNodeInTree tries to match against any node in the tree
            // maybe there's an option on matchNodeInTree to not recurse

            const pattern = parse('#a #x')
            const constantPattern = parse('#a')

            // TODO: include the constraints in the pattern
            const coefficientMap = {}
            const constants = []

            ast.args.forEach(arg => {
                let results

                results = matchNode(pattern, arg, { x: isIdentifier, a: isNumber })

                if (results) {
                    const {placeholders} = results

                    const clone = { ...placeholders.x }

                    delete clone.loc

                    // this is to handle x^2 etc.
                    const key = JSON.stringify(clone)

                    if (!(key in coefficientMap)) {
                        coefficientMap[key] = []
                    }

                    coefficientMap[key].push(placeholders.a)
                }

                results = matchNode(constantPattern, arg, { a: isNumber })

                if (results) {
                    constants.push(arg)
                }
            })

            // canonical representation of a term
            // it's all about ordering
            // ordering of factors with in a term is alphabetic
            // order terms with an epxression is by highest order to lowest

            const result = nodes.applyNode(
                'add',
                Object.keys(coefficientMap).sort().map(key => {
                    const coeffs = coefficientMap[key]
                    const variable = JSON.parse(key)

                    const terms = coeffs.map(coeff =>
                        populatePatternString('#a #x', {
                            a: coeff,
                            x: variable,  // it's okay to reuse b/c populatePattern clones
                        })
                    )

                    return terms.length > 1
                        ? nodes.applyNode('add', terms)
                        : terms[0]
                }))

            if (constants.length > 0) {
                result.args.push(nodes.applyNode('add', constants))
            }

            assert.equal(print(result), '(2 x + 9 x) + (7 y + 3 y) + (5 + 11)')
        })
    })
})
