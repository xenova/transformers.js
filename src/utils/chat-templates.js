/**
 * @file Templates for Chat Models
 * 
 * A minimalistic JavaScript reimplementation of the [Jinja](https://github.com/pallets/jinja) templating engine,
 * to support the chat templates. Special thanks to [Tyler Laceby](https://github.com/tlaceby) for his amazing
 * ["Guide to Interpreters"](https://github.com/tlaceby/guide-to-interpreters-series) tutorial series,
 * which provided the basis for this implementation.
 * 
 * **Example:** Applying a chat template to a chat history
 * 
 * ```javascript
 * import { AutoTokenizer } from '@xenova/transformers';
 * 
 * const tokenizer = await AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.1");
 * 
 * const chat = [
 *   { "role": "user", "content": "Hello, how are you?" },
 *   { "role": "assistant", "content": "I'm doing great. How can I help you today?" },
 *   { "role": "user", "content": "I'd like to show off how chat templating works!" },
 * ]
 * 
 * const text = tokenizer.apply_chat_template(chat, { tokenize: false });
 * // "<s>[INST] Hello, how are you? [/INST]I'm doing great. How can I help you today?</s> [INST] I'd like to show off how chat templating works! [/INST]"
 * 
 * const input_ids = tokenizer.apply_chat_template(chat, { tokenize: true, return_tensor: false });
 * // [1, 733, 16289, 28793, 22557, 28725, 910, 460, 368, 28804, 733, 28748, 16289, 28793, 28737, 28742, 28719, 2548, 1598, 28723, 1602, 541, 315, 1316, 368, 3154, 28804, 2, 28705, 733, 16289, 28793, 315, 28742, 28715, 737, 298, 1347, 805, 910, 10706, 5752, 1077, 3791, 28808, 733, 28748, 16289, 28793]
 * ```
 * 
 * See the [Transformers documentation](https://huggingface.co/docs/transformers/main/en/chat_templating) for more information.
 * 
 * @module utils/chat-templates
 */

/**
 * Statements do not result in a value at runtime. They contain one or more expressions internally.
 */
class Statement {
    type = 'Statement';
}

/**
 * Defines a block which contains many statements. Each chat template corresponds to one Program.
 */
class Program extends Statement {
    type = 'Program';

    /**
     * 
     * @param {Statement[]} body 
     */
    constructor(body) {
        super();
        this.body = body;
    }
}

class If extends Statement {
    type = 'If';

    /**
     * 
     * @param {Expression} test 
     * @param {Statement[]} body 
     * @param {Statement[]} alternate 
     */
    constructor(test, body, alternate) {
        super();
        this.test = test;
        this.body = body;
        this.alternate = alternate;
    }
}

class For extends Statement {
    type = 'For';

    /**
     * 
     * @param {Identifier} loopvar 
     * @param {Expression} iterable 
     * @param {Statement[]} body 
     */
    constructor(loopvar, iterable, body) {
        super();
        this.loopvar = loopvar;
        this.iterable = iterable;
        this.body = body;
    }
}

class SetStatement extends Statement { // `Set` is taken
    type = 'Set';
    /**
     * 
     * @param {Expression} assignee 
     * @param {Expression} value 
     */
    constructor(assignee, value) {
        super();
        this.assignee = assignee;
        this.value = value;
    }
}

/**
 * Expressions will result in a value at runtime (unlike statements).
 */
class Expression extends Statement {
    type = 'Expression';
}

class MemberExpression extends Expression {
    type = 'MemberExpression';

    /**
     * 
     * @param {Expression} object 
     * @param {Expression} property 
     * @param {boolean} computed
     */
    constructor(object, property, computed) {
        super();
        this.object = object;
        this.property = property;
        this.computed = computed; // true: object[property], false: object.property
    }
}

class CallExpression extends Expression {
    type = 'CallExpression';

    /**
     * 
     * @param {Expression} callee 
     * @param {Expression[]} args 
     */
    constructor(callee, args) {
        super();
        this.callee = callee;
        this.args = args;
    }
}

/**
 * Represents a user-defined variable or symbol in the template.
 */
class Identifier extends Expression {
    type = 'Identifier';

    /**
     * 
     * @param {string} value The name of the identifier
     */
    constructor(value) {
        super();
        this.value = value;
    }
}

/**
 * Abstract base class for all Literal expressions.
 * Should not be instantiated directly.
 * 
 * @abstract
 * @template T
 */
class Literal extends Expression {
    type = 'Literal';

    /**
     * 
     * @param {T} value 
     */
    constructor(value) {
        super();
        this.value = value;
    }
}

/**
 * Represents a numeric constant in the template.
 * @extends {Literal<number>}
 */
class NumericLiteral extends Literal {
    type = 'NumericLiteral';
}

/**
 * Represents a text constant in the template.
 * @extends {Literal<string>}
 */
class StringLiteral extends Literal {
    type = 'StringLiteral';
    /**
     * 
     * @param {string} value 
     */
    constructor(value) {
        super(value);
    }
}

/**
 * Represents a boolean constant in the template.
 * @extends {Literal<boolean>}
 */
class BooleanLiteral extends Literal {
    type = 'BooleanLiteral';
}

// TODO use
// class CallExpressionNode extends Expression {
//     type = 'CallExpression';

//     /**
//      * 
//      * @param {string} identifier 
//      * @param {Statement} argument 
//      */
//     constructor(identifier, argument) {
//         super();
//         this.identifier = identifier;
//         this.argument = argument;
//     }
// }

/**
 * An operation with two sides, seperated by a operator.
 * Note: Either side can be a Complex Expression, with order
 * of operations being determined by the operator.
 */
class BinaryExpression extends Expression {
    type = 'BinaryExpression';

    /**
     * 
     * @param {Token} operator 
     * @param {Expression} left 
     * @param {Expression} right 
     */
    constructor(operator, left, right) {
        super();
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

/**
 * An operation with one side (operator on the left).
 */
class UnaryExpression extends Expression {
    type = 'UnaryExpression';

    /**
     * 
     * @param {Token} operator 
     * @param {Expression} argument 
     */
    constructor(operator, argument) {
        super();
        this.operator = operator;
        this.argument = argument;
    }
}

/**
 * Represents tokens that our language understands in parsing.
 */
const TOKEN_TYPES = Object.freeze({
    NumericLiteral: 'NumericLiteral',
    BooleanLiteral: 'BooleanLiteral',
    StringLiteral: 'StringLiteral',
    Identifier: 'Identifier',
    Equals: 'Equals',
    OpenParen: 'OpenParen',
    CloseParen: 'CloseParen',
    OpenStatement: 'OpenStatement', // {%
    CloseStatement: 'CloseStatement', // %}
    OpenExpression: 'OpenExpression', // {{
    CloseExpression: 'CloseExpression', // }}
    OpenSquareBracket: 'OpenSquareBracket', // [
    CloseSquareBracket: 'CloseSquareBracket', // ]
    Comma: 'Comma',
    Dot: 'Dot',

    CallOperator: 'CallOperator', // ()

    AdditiveBinaryOperator: 'AdditiveBinaryOperator',
    MultiplicativeBinaryOperator: 'MultiplicativeBinaryOperator',
    ComparisonBinaryOperator: 'ComparisonBinaryOperator',
    UnaryOperator: 'UnaryOperator', // not

    Set: 'Set',
    If: 'If',
    For: 'For',
    In: 'In',
    Else: 'Else',
    EndIf: 'EndIf',
    ElseIf: 'ElseIf',
    EndFor: 'EndFor',

    // Logical operators
    And: 'And',
    Or: 'Or',

    // TODO Add unary operators
})

/**
 * @typedef {keyof typeof TOKEN_TYPES} TokenType
 */

/**
 * Constant lookup for keywords and known identifiers + symbols.
 */
const KEYWORDS = Object.freeze({
    set: TOKEN_TYPES.Set,
    for: TOKEN_TYPES.For,
    in: TOKEN_TYPES.In,
    if: TOKEN_TYPES.If,
    else: TOKEN_TYPES.Else,
    endif: TOKEN_TYPES.EndIf,
    elif: TOKEN_TYPES.ElseIf,
    endfor: TOKEN_TYPES.EndFor,

    and: TOKEN_TYPES.And,
    or: TOKEN_TYPES.Or,
    not: TOKEN_TYPES.UnaryOperator,
})

/**
 * Represents a single token in the template.
 */
class Token {
    /**
     * Constructs a new Token.
     * @param {string} value The raw value as seen inside the source code.
     * @param {TokenType} type The type of token.
     */
    constructor(value, type) {
        this.value = value;
        this.type = type;
    }
}

function isWord(char) {
    return /\w/.test(char);
}

function isInteger(char) {
    return /[0-9]/.test(char);
}

/**
 * Generate a list of tokens from a source string.
 * @param {string} source
 * @returns {Token[]} 
 */
export function tokenize(source) {
    /** @type {Token[]} */
    const tokens = [];
    const src = Array.from(source);

    let cursorPosition = 0;

    // Build each token until end of input
    while (cursorPosition < src.length) {
        let char = src[cursorPosition];

        if (/\s/.test(char)) { // Ignore whitespace
            ++cursorPosition; continue;
        }

        ////////////////////////////////////////
        // Handle control sequences
        if (char === '{' && src[cursorPosition + 1] === '%') {
            tokens.push(new Token('{%', TOKEN_TYPES.OpenStatement));
            cursorPosition += 2; continue;
        }
        if (char === '%' && src[cursorPosition + 1] === '}') {
            tokens.push(new Token('%}', TOKEN_TYPES.CloseStatement));
            cursorPosition += 2; continue;
        }
        if (char === '{' && src[cursorPosition + 1] === '{') {
            tokens.push(new Token('{{', TOKEN_TYPES.OpenExpression));
            cursorPosition += 2; continue;
        }
        if (char === '}' && src[cursorPosition + 1] === '}') {
            tokens.push(new Token('}}', TOKEN_TYPES.CloseExpression));
            cursorPosition += 2; continue;
        }
        ////////////////////////////////////////

        if (char === '(') {
            tokens.push(new Token(char, TOKEN_TYPES.OpenParen));
            ++cursorPosition; continue;
        }

        if (char === ')') {
            tokens.push(new Token(char, TOKEN_TYPES.CloseParen));
            ++cursorPosition; continue;
        }

        if (char === '[') {
            tokens.push(new Token(char, TOKEN_TYPES.OpenSquareBracket));
            ++cursorPosition; continue;
        }

        if (char === ']') {
            tokens.push(new Token(char, TOKEN_TYPES.CloseSquareBracket));
            ++cursorPosition; continue;
        }

        if (char === ',') {
            tokens.push(new Token(char, TOKEN_TYPES.Comma));
            ++cursorPosition; continue;
        }

        if (char === '.') {
            tokens.push(new Token(char, TOKEN_TYPES.Dot));
            ++cursorPosition; continue;
        }


        // Conditional operators
        if ((['<', '>', '=', '!'].includes(char)) && src[cursorPosition + 1] === '=') { // >= or <= or == or !=
            tokens.push(new Token(char + src[cursorPosition + 1], TOKEN_TYPES.ComparisonBinaryOperator));
            cursorPosition += 2; continue;
        }
        if (['<', '>'].includes(char)) {
            tokens.push(new Token(char, TOKEN_TYPES.ComparisonBinaryOperator));
            ++cursorPosition; continue;
        }

        // Arithmetic operators
        if (['+', '-'].includes(char)) {
            tokens.push(new Token(char, TOKEN_TYPES.AdditiveBinaryOperator));
            ++cursorPosition; continue;
        }
        if (['*', '/', '%'].includes(char)) {
            tokens.push(new Token(char, TOKEN_TYPES.MultiplicativeBinaryOperator));
            ++cursorPosition; continue;
        }


        // Assignment operator
        if (char === '=') {
            tokens.push(new Token(char, TOKEN_TYPES.Equals));
            ++cursorPosition; continue;
        }

        if (char === "'") {
            let str = '';
            char = src[++cursorPosition];
            while (char !== "'") {
                if (char === undefined) {
                    throw new SyntaxError('Unterminated string literal');
                }
                str += char;
                char = src[++cursorPosition];
            }

            tokens.push(new Token(str, TOKEN_TYPES.StringLiteral));
            ++cursorPosition; continue;
        }

        // Handle multi-character tokens

        if (isInteger(char)) {
            let num = '';
            while (true) {
                num += char;
                char = src[++cursorPosition];
                if (!isInteger(char)) {
                    break;
                }
            }
            tokens.push(new Token(num, TOKEN_TYPES.NumericLiteral));
            continue;
        }

        if (isWord(char)) {
            let word = '';
            while (true) {
                word += char;
                char = src[++cursorPosition];
                if (!isWord(char)) {
                    break;
                }
            }

            // Check for reserved keywords
            tokens.push(new Token(word,
                Object.hasOwn(KEYWORDS, word)
                    ? KEYWORDS[word]
                    : TOKEN_TYPES.Identifier
            ));
            continue;
        }

        throw new SyntaxError(`Unexpected character: ${char}`);
    }
    return tokens;
}

/**
 * Generate the Abstract Syntax Tree (AST) from a list of tokens.
 * Operator precedence can be found here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence#table
 * @param {Token[]} tokens 
 * @returns {Program}
 */
export function parse(tokens) {
    const program = new Program([]);
    let current = 0;

    /**
     * 
     * @param {string} type 
     * @param {string} error 
     */
    function expect(type, error) {
        const prev = tokens[current++];
        if (!prev || prev.type !== type) {
            throw new Error(`Parser Error: ${error}. ${prev.type} !== ${type}.`)
        }
        return prev;
    }

    function parseAny() {
        switch (tokens[current].type) {
            case TOKEN_TYPES.OpenStatement:
                return parseJinjaStatement();
            case TOKEN_TYPES.OpenExpression:
                return parseJinjaExpression();
            default:
                throw new SyntaxError(`Unexpected token type: ${tokens[current].type}`);
        }
    }

    /**
     * 
     * @param {TokenType[]} types
     */
    function not(...types) {
        return current + types.length <= tokens.length
            && types.some((type, i) => type !== tokens[current + i].type);
    }

    /**
     * 
     * @param {TokenType[]} types
     */
    function is(...types) {
        return current + types.length <= tokens.length
            && types.every((type, i) => type === tokens[current + i].type);
    }

    /**
     * 
     * @returns {Statement[]}
     */
    function parseBlock() { // Could be a statement or an expression
        const body = [];
        while (not(TOKEN_TYPES.OpenStatement)) {
            body.push(parseAny());
        }
        return body;
    }

    function parseJinjaStatement() {
        // Consume {% %} tokens
        expect(TOKEN_TYPES.OpenStatement, 'Expected opening statement token');

        let result;
        switch (tokens[current].type) {
            case TOKEN_TYPES.Set:
                ++current;
                result = parseSetStatement();
                expect(TOKEN_TYPES.CloseStatement, 'Expected closing statement token');
                break;

            case TOKEN_TYPES.If:
                ++current;
                result = parseIfStatement();
                expect(TOKEN_TYPES.OpenStatement, 'Expected {% token');
                expect(TOKEN_TYPES.EndIf, 'Expected endif token');
                expect(TOKEN_TYPES.CloseStatement, 'Expected %} token');
                break;

            case TOKEN_TYPES.For:
                ++current;
                result = parseForStatement();
                expect(TOKEN_TYPES.OpenStatement, 'Expected {% token');
                expect(TOKEN_TYPES.EndFor, 'Expected endfor token');
                expect(TOKEN_TYPES.CloseStatement, 'Expected %} token');
                break;
            default:
                throw new SyntaxError(`Unknown statement type: ${tokens[current].type}`);
        }

        return result;
    }

    function parseJinjaExpression() {
        // Consume {{ }} tokens
        expect(TOKEN_TYPES.OpenExpression, 'Expected opening expression token');

        let result = parseExpression();

        expect(TOKEN_TYPES.CloseExpression, 'Expected closing expression token');
        return result;
    }


    // NOTE: `set` acts as both declaration statement and assignment expression
    function parseSetStatement() {
        const left = parseExpression();

        if (tokens[current]?.type === TOKEN_TYPES.Equals) {
            ++current;
            const value = parseSetStatement();

            return new SetStatement(left, value);
        }
        return left;
    }

    function parseIfStatement() {

        const test = parseExpression();

        expect(TOKEN_TYPES.CloseStatement, 'Expected closing statement token');

        /** @type {Statement[]} */
        let alternate = [];

        const body = parseBlock();

        // Check for {% elif %} or {% else %}
        if (
            tokens[current]?.type === TOKEN_TYPES.OpenStatement
            && tokens[current + 1]?.type !== TOKEN_TYPES.EndIf // There is some body
        ) {
            ++current; // eat {% token
            if (tokens[current]?.type === TOKEN_TYPES.ElseIf) {
                expect(TOKEN_TYPES.ElseIf, 'Expected elseif token')
                alternate = [parseIfStatement()];
            } else { //  if (tokens[current]?.type === TokenType.Else)
                expect(TOKEN_TYPES.Else, 'Expected else token')
                expect(TOKEN_TYPES.CloseStatement, 'Expected closing statement token')
                alternate = parseBlock(); // parse else block
            }
        }

        return new If(test, body, alternate);

    }

    function parseForStatement() {

        // e.g., `message` in `for message in messages`
        const loopVariable = parsePrimaryExpression(); // should be an identifier
        if (loopVariable.type !== 'Identifier') {
            throw new SyntaxError(`Expected identifier for the loop variable`);
        }

        expect(TOKEN_TYPES.In, 'Expected `in` keyword following loop variable');

        // messages in `for message in messages`
        const iterable = parseExpression();

        expect(TOKEN_TYPES.CloseStatement, 'Expected closing statement token');

        // Body of for loop
        const body = [];

        // Keep going until we hit {% endfor
        while (not(TOKEN_TYPES.OpenStatement, TOKEN_TYPES.EndFor)) {
            body.push(parseAny());
        }

        return new For(loopVariable, iterable, body);
    }


    function parseExpression() {
        // Choose parse function with lowest precedence
        return parseLogicalOrExpression();
    }
    function parseLogicalOrExpression() {
        let left = parseLogicalAndExpression();
        while (is(TOKEN_TYPES.Or)) {
            const operator = tokens[current];
            ++current;
            const right = parseLogicalAndExpression();
            left = new BinaryExpression(operator, left, right);
        }
        return left;
    }

    function parseLogicalAndExpression() {
        let left = parseComparisonExpression();
        while (is(TOKEN_TYPES.And)) {
            const operator = tokens[current];
            ++current;
            const right = parseComparisonExpression();
            left = new BinaryExpression(operator, left, right);
        }
        return left;
    }

    function parseComparisonExpression() {
        let left = parseAdditiveExpression();
        while (is(TOKEN_TYPES.ComparisonBinaryOperator)) {
            const operator = tokens[current];
            ++current;
            const right = parseAdditiveExpression();
            left = new BinaryExpression(operator, left, right);
        }
        return left;
    }
    function parseAdditiveExpression() {
        let left = parseMultiplicativeExpression();
        while (is(TOKEN_TYPES.AdditiveBinaryOperator)) {
            const operator = tokens[current];
            ++current;
            const right = parseMultiplicativeExpression();
            left = new BinaryExpression(operator, left, right);
        }
        return left;
    }


    function parseCallMemberExpression() {
        // Handle member expressions recursively

        const member = parseMemberExpression(); // foo.x

        if (tokens[current]?.type === TOKEN_TYPES.OpenParen) {
            // foo.x()
            return parseCallExpression(member);
        }
        return member;
    }

    function parseCallExpression(callee) {
        let callExpression = new CallExpression(callee, parseArgs());

        if (tokens[current]?.type === TOKEN_TYPES.OpenParen) {
            // foo.x()()
            callExpression = parseCallExpression(callExpression);
        }

        return callExpression;
    }

    function parseArgs() { // add (x + 5, foo())
        expect(TOKEN_TYPES.OpenParen, 'Expected opening parenthesis for arguments list');

        const args =
            tokens[current]?.type === TOKEN_TYPES.CloseParen
                ? []
                : parseArgumentsList();

        expect(TOKEN_TYPES.CloseParen, 'Expected closing parenthesis for arguments list');
        return args;
    }
    function parseArgumentsList() { // comma-separated arguments list
        const args = [parseExpression()]; // Update when we allow assignment expressions

        while (is(TOKEN_TYPES.Comma)) {
            ++current; // consume comma
            args.push(parseExpression());
        }
        return args;

    }
    function parseMemberExpression() {
        let object = parsePrimaryExpression();

        while (
            is(TOKEN_TYPES.Dot) || is(TOKEN_TYPES.OpenSquareBracket)
        ) {
            const operator = tokens[current]; // . or [
            ++current;
            let property;
            let computed = operator.type !== TOKEN_TYPES.Dot;
            if (computed) { // computed (i.e., bracket notation: obj[expr])
                property = parseExpression();
                expect(TOKEN_TYPES.CloseSquareBracket, 'Expected closing square bracket');
            } else { // non-computed (i.e., dot notation: obj.expr)
                property = parsePrimaryExpression(); // should be an identifier
                if (property.type !== 'Identifier') {
                    throw new SyntaxError(`Expected identifier following dot operator`);
                }
            }
            object = new MemberExpression(object, property, computed);
        }
        return object;
    }

    function parseMultiplicativeExpression() {
        let left = parseLogicalNegationExpression();

        while (is(TOKEN_TYPES.MultiplicativeBinaryOperator)) {
            const operator = tokens[current];
            ++current;
            const right = parseLogicalNegationExpression();
            left = new BinaryExpression(operator, left, right);
        }
        return left;
    }

    function parseLogicalNegationExpression() {
        let right;

        // Try parse unary operators
        while (is(TOKEN_TYPES.UnaryOperator)) { // not not ...
            const operator = tokens[current];
            ++current;
            const arg = parseLogicalNegationExpression(); // not test.x === not (test.x)
            right = new UnaryExpression(operator, arg);
        }

        return right ?? parseCallMemberExpression();
    }

    function parsePrimaryExpression() {
        // Primary expression: number, string, identifier, function call, parenthesized expression
        const token = tokens[current];
        switch (token.type) {
            case TOKEN_TYPES.NumericLiteral:
                ++current;
                return new NumericLiteral(Number(token.value));
            case TOKEN_TYPES.StringLiteral:
                ++current;
                return new StringLiteral(token.value);
            case TOKEN_TYPES.Identifier:
                ++current;
                return new Identifier(token.value);
            case TOKEN_TYPES.OpenParen:
                ++current; // consume opening parenthesis
                const expression = parseExpression();
                if (tokens[current].type !== TOKEN_TYPES.CloseParen) {
                    throw new SyntaxError('Expected closing parenthesis');
                }
                ++current; // consume closing parenthesis
                return expression;
            default:
                throw new SyntaxError(`Unexpected token: ${token.type}`);
        }
    }

    while (current < tokens.length) {
        program.body.push(parseAny());
    }

    return program;
}

/**
 * Abstract base class for all Runtime values.
 * Should not be instantiated directly.
 * 
 * @abstract
 * @template T
 */
class RuntimeValue {
    type = 'RuntimeValue';

    /**
     * A collection of built-in functions for this type.
     * @type {Map<string, RuntimeValue>}
     */
    builtins = new Map();

    /**
     * Creates a new RuntimeValue.
     * @param {T} value 
     */
    constructor(value = undefined) {
        this.value = value;
    }
}

/**
 * Represents a numeric value at runtime.
 * @extends {RuntimeValue<number>}
 */
class NumericValue extends RuntimeValue {
    type = 'NumericValue';
}

/**
 * Represents a string value at runtime.
 * @extends {RuntimeValue<string>}
 */
class StringValue extends RuntimeValue {
    type = 'StringValue';

    builtins = new Map(/** @type {[string, RuntimeValue][]} */([
        ['upper', new FunctionValue(() => {
            return new StringValue(this.value.toUpperCase());
        })],
        ['lower', new FunctionValue(() => {
            return new StringValue(this.value.toLowerCase());
        })],
        ['strip', new FunctionValue(() => {
            return new StringValue(this.value.trim());
        })],
        ['length', new NumericValue(this.value.length)],
    ]));
}

/**
 * Represents a boolean value at runtime.
 * @extends {RuntimeValue<boolean>}
 */
class BooleanValue extends RuntimeValue {
    type = 'BooleanValue';
}

/**
 * Represents an Object value at runtime.
 * @extends {RuntimeValue<Map<string, RuntimeValue>>}
 */
class ObjectValue extends RuntimeValue {
    type = 'ObjectValue';
}

/**
 * Represents an Array value at runtime.
 * @extends {RuntimeValue<RuntimeValue[]>}
 */
class ArrayValue extends RuntimeValue {
    type = 'ArrayValue';
}

/**
 * Represents a Function value at runtime.
 * @extends {RuntimeValue<function (RuntimeValue[], Environment): RuntimeValue>}
 */
class FunctionValue extends RuntimeValue {
    type = 'FunctionValue';
}

/**
 * Represents a Null value at runtime.
 * @extends {RuntimeValue<null>}
 */
class NullValue extends RuntimeValue {
    type = 'NullValue';
}

/**
 * Represents the current environment (scope) at runtime.
 */
export class Environment {
    /**
     * 
     * @param {Environment?} parent 
     */
    constructor(parent = undefined) {
        this.parent = parent;

        /**
         * @property The variables declared in this environment.
         * @type {Map<string, RuntimeValue>}
         */
        this.variables = new Map();
    }

    /**
     * Set the value of a variable in the current environment.
     * @param {string} name The name of the variable.
     * @param {any} value The value to set.
     * @returns {RuntimeValue}
     */
    set(name, value) {
        return this.declareVariable(name, convertToRuntimeValues(value));
    }

    /**
     * 
     * @param {string} name 
     * @param {RuntimeValue} value 
     * @returns {RuntimeValue}
     * @private
     */
    declareVariable(name, value) {
        if (this.variables.has(name)) {
            throw new SyntaxError(`Variable already declared: ${name}`);
        }
        this.variables.set(name, value);
        return value;
    }

    /**
     * 
     * @param {string} name 
     * @param {RuntimeValue} value 
     * @returns {RuntimeValue}
     * @private
     */
    assignVariable(name, value) {
        const env = this.resolve(name);
        env.variables.set(name, value);
        return value;
    }

    /**
     * Declare if doesn't exist, assign otherwise.
     * @param {string} name 
     * @param {RuntimeValue} value 
     * @returns {RuntimeValue}
     */
    setVariable(name, value) {
        /** @type {Environment} */
        let env = this;
        try {
            env = this.resolve(name);
        } catch { }
        env.variables.set(name, value);
        return value;
    }

    /**
     * Resolve the environment in which the variable is declared.
     * @param {string} name The name of the variable.
     * @returns {Environment} The environment in which the variable is declared.
     * @private
     */
    resolve(name) {
        if (this.variables.has(name)) {
            return this;
        }

        // Traverse scope chain
        if (this.parent) {
            return this.parent.resolve(name);
        }

        throw new Error(`Unknown variable: ${name}`);
    }

    /**
     * 
     * @param {string} name 
     * @returns {RuntimeValue}
     */
    lookupVariable(name) {
        return this.resolve(name).variables.get(name);
    }
}

export class Interpreter {

    /**
     * 
     * @param {Environment?} env 
     */
    constructor(env = undefined) {
        this.global = env ?? new Environment();
    }

    /**
     * Run the program.
     * @param {Program} program 
     * @returns {RuntimeValue}
     */
    run(program) {
        return this.evaluate(program, this.global);
    }

    /**
     * Evaulates expressions following the binary operation type.
     * @param {BinaryExpression} node 
     * @param {Environment} environment
     * @returns {RuntimeValue}
     * @private
     */
    evaluateBinaryExpression(node, environment) {
        const left = this.evaluate(node.left, environment);
        const right = this.evaluate(node.right, environment);


        if (left instanceof NumericValue && right instanceof NumericValue) {
            // Evaulate pure numeric operations with binary operators.
            switch (node.operator.value) {
                // Arithmetic operators
                case '+': return new NumericValue(left.value + right.value);
                case '-': return new NumericValue(left.value - right.value);
                case '*': return new NumericValue(left.value * right.value);
                case '/': return new NumericValue(left.value / right.value);
                case '%': return new NumericValue(left.value % right.value);

                // Comparison operators
                case '<': return new BooleanValue(left.value < right.value);
                case '>': return new BooleanValue(left.value > right.value);
                case '>=': return new BooleanValue(left.value >= right.value);
                case '<=': return new BooleanValue(left.value <= right.value);
                case '==': return new BooleanValue(left.value == right.value);
                case '!=': return new BooleanValue(left.value != right.value);

                default: throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
            }
        } else if (
            (left instanceof BooleanValue || left instanceof BooleanLiteral)
            &&
            (right instanceof BooleanValue || right instanceof BooleanLiteral)
        ) {
            // Logical operators
            switch (node.operator.value) {
                case 'and': return new BooleanValue(left.value && right.value);
                case 'or': return new BooleanValue(left.value || right.value);
                case '!=': return new BooleanValue(left.value != right.value);
                default: throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
            }
        } else {
            switch (node.operator.value) {
                case '+': return new StringValue(left.value + right.value);
                case '==': return new BooleanValue(left.value == right.value);
                case '!=': return new BooleanValue(left.value != right.value);
                default: throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
            }
        }
    }

    /**
     * Evaulates expressions following the unary operation type.
     * @param {UnaryExpression} node 
     * @param {Environment} environment
     * @returns {RuntimeValue}
     * @private
     */
    evaluateUnaryExpression(node, environment) {
        const argument = this.evaluate(node.argument, environment);

        switch (node.operator.value) {
            case 'not': return new BooleanValue(!argument.value);
            default: throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
        }
    }

    /**
     * 
     * @param {Program} program 
     * @param {Environment} environment
     * @returns {RuntimeValue}
     * @private
     */
    evalProgram(program, environment) {
        return this.evaluateBlock(program.body, environment);
    }

    /**
     * 
     * @param {Statement[]} statements 
     * @param {Environment} environment 
     * @returns {StringValue}
     * @private
     */
    evaluateBlock(statements, environment) {
        // Jinja templates always evaluate to a String,
        // so we accumulate the result of each statement into a final string

        let result = '';
        for (const statement of statements) {
            let lastEvaluated = this.evaluate(statement, environment);

            if (lastEvaluated.type !== 'NullValue') {
                result += lastEvaluated.value;
            }
        }

        return new StringValue(result);
    }

    /**
     * 
     * @param {Identifier} node 
     * @param {Environment} environment 
     * @returns {RuntimeValue}
     * @private
     */
    evaluateIdentifier(node, environment) {
        return environment.lookupVariable(node.value);
    }

    /**
     * 
     * @param {CallExpression} expr 
     * @param {Environment} environment 
     * @returns {RuntimeValue}
     * @private
     */
    evaluateCallExpression(expr, environment) {
        const args = expr.args.map(arg => this.evaluate(arg, environment));
        const fn = this.evaluate(expr.callee, environment);
        if (fn.type !== 'FunctionValue') {
            throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
        }
        return /** @type {FunctionValue} */ (fn).value(args, environment);
    }

    /**
     * 
     * @param {MemberExpression} expr 
     * @param {Environment} environment 
     * @private
     */
    evaluateMemberExpression(expr, environment) {
        const property = expr.computed
            ? this.evaluate(expr.property, environment)
            : new StringValue(/** @type {Identifier} */(expr.property).value); // expr.property.value

        if (property.type !== 'StringValue') {
            // TODO integer indexing for arrays
            throw new Error(`Cannot access property with non-string: got ${property.type}`);
        }

        const object = this.evaluate(expr.object, environment);

        const value = object instanceof ObjectValue
            ? object.value.get(property.value) ?? object.builtins.get(property.value)
            : object.builtins.get(property.value);

        if (!(value instanceof RuntimeValue)) {
            throw new Error(`${object.type} has no property '${property.value}'`);
        }
        return value;
    }

    /**
     * 
     * @param {SetStatement} node 
     * @param {Environment} environment 
     * @returns {NullValue}
     * @private
     */
    evaluateSet(node, environment) {
        if (node.assignee.type !== 'Identifier') {
            throw new Error(`Invalid LHS inside assignment expression: ${JSON.stringify(node.assignee)}`);
        }

        const variableName = /** @type {Identifier} */ (node.assignee).value;
        environment.setVariable(variableName, this.evaluate(node.value, environment));
        return new NullValue();
    }

    /**
     * 
     * @param {If} node 
     * @param {Environment} environment 
     * @returns {RuntimeValue}
     * @private
     */
    evaluateIf(node, environment) {
        const test = this.evaluate(node.test, environment);
        if (!['BooleanValue', 'BooleanLiteral'].includes(test.type)) {
            throw new Error(`Expected boolean expression in if statement: got ${test.type}`);
        }
        return this.evaluateBlock(test.value ? node.body : node.alternate, environment);
    }

    /**
     * 
     * @param {For} node 
     * @param {Environment} environment 
     * @returns {RuntimeValue}
     * @private
     */
    evaluateFor(node, environment) {
        // Scope for the for loop
        const scope = new Environment(environment);

        const iterable = /** @type {ArrayValue} */ (this.evaluate(node.iterable, scope));
        if (iterable.type !== 'ArrayValue') {
            throw new Error(`Expected object in for loop: got ${iterable.type}`);
        }
        const loopVariable = node.loopvar.value;
        const body = node.body;
        let loopIndex = 0;
        let result = '';

        for (const element of iterable.value) {
            // Update the loop index variable
            // TODO: Only create object once, then update value?
            scope.setVariable('loop', new ObjectValue(new Map(
                /** @type {[string, RuntimeValue][]} */([
                    ['index', new NumericValue(loopIndex + 1)],
                    ['index0', new NumericValue(loopIndex)],
                    ['first', new BooleanValue(loopIndex === 0)],
                    ['last', new BooleanValue(loopIndex === iterable.value.length - 1)],
                    ['length', new NumericValue(iterable.value.length)]

                    // missing: revindex, revindex0, cycle, depth, depth0, previtem, nextitem, changed
                ])
            )));
            ++loopIndex; // Increment loop index

            // For this iteration, set the loop variable to the current element
            scope.setVariable(loopVariable, element);

            // Evaluate the body of the for loop
            const evaluated = this.evaluateBlock(body, scope);
            result += evaluated.value;
        }

        return new StringValue(result);
    }

    /**
     * 
     * @param {Statement} statement 
     * @param {Environment} environment
     * @returns {RuntimeValue} 
     * @private
     */
    evaluate(statement, environment) {
        switch (statement.type) {
            // Program
            case 'Program':
                return this.evalProgram(/** @type {Program} */(statement), environment);

            // Statements
            case 'Set':
                return this.evaluateSet(/** @type {SetStatement} */(statement), environment);
            case 'If':
                return this.evaluateIf(/** @type {If} */(statement), environment);
            case 'For':
                return this.evaluateFor(/** @type {For} */(statement), environment);

            // Expressions
            case 'NumericLiteral':
                return new NumericValue(Number(/** @type {NumericLiteral} */(statement).value));
            case 'StringLiteral':
                return new StringValue(/** @type {StringLiteral} */(statement).value);
            case 'BooleanLiteral':
                return new BooleanValue(/** @type {BooleanLiteral} */(statement).value);
            case 'Identifier':
                return this.evaluateIdentifier(/** @type {Identifier} */(statement), environment);
            case 'CallExpression':
                return this.evaluateCallExpression(/** @type {CallExpression} */(statement), environment);
            case 'MemberExpression':
                return this.evaluateMemberExpression(/** @type {MemberExpression} */(statement), environment);

            case 'UnaryExpression':
                return this.evaluateUnaryExpression(/** @type {UnaryExpression} */(statement), environment);
            case 'BinaryExpression':
                return this.evaluateBinaryExpression(/** @type {BinaryExpression} */(statement), environment);

            default:
                throw new SyntaxError(`Unknown node type: ${statement.type}`);
        }
    }
}

/**
 * Helper function to convert JavaScript values to runtime values.
 * @param {any} input 
 * @returns {RuntimeValue}
 */
function convertToRuntimeValues(input) {
    switch (typeof input) {
        case 'number':
            return new NumericValue(input);
        case 'string':
            return new StringValue(input);
        case 'boolean':
            return new BooleanValue(input);
        case 'object':
            if (input === null) {
                return new NullValue();
            } else if (Array.isArray(input)) {
                return new ArrayValue(input.map(convertToRuntimeValues));
            } else {
                return new ObjectValue(
                    new Map(Object.entries(input).map(([key, value]) => [key, convertToRuntimeValues(value)]))
                );
            }
        case 'function':
            // Wrap the user's function in a runtime function
            return new FunctionValue((args, scope) => {
                // NOTE: `scope` is not used since it's in the global scope
                const result = input(...args.map(x => x.value)) ?? null; // map undefined -> null
                return convertToRuntimeValues(result);
            });
        default:
            throw new Error(`Cannot convert to runtime value: ${input}`);
    }
}

export class Template {
    // trim_blocks=True, lstrip_blocks=True
    /**
     * 
     * @param {string} template The template string
     */
    constructor(template) {
        const tokens = tokenize(template);
        this.parsed = parse(tokens);
    }

    /**
     * 
     * @param {Object} items 
     * 
     * @returns {string}
     */
    render(items) {
        // Create a new environment for this template
        const env = new Environment();

        // Declare global variables
        env.set('false', false);
        env.set('true', true);
        env.set('raise_exception', (args, scope) => {
            throw new Error(args);
        });

        // Add user-defined variables
        for (const [key, value] of Object.entries(items)) {
            env.set(key, value);
        }

        const interpreter = new Interpreter(env);

        const result = interpreter.run(this.parsed);
        return result.value;
    }
}
