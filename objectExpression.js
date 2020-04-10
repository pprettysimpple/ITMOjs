"use strict";

// Const

const Const = function(val) {
	this.val = val;
}
Const.CONSTANTS = {
	"zero": new Const(0),
	"one": new Const(1),
	"two": new Const(2)
}
Const.prototype.evaluate = function() { return this.val; };
Const.prototype.diff = () => Const.CONSTANTS.zero;
Const.prototype.toString = function() { return "" + this.val; };
Const.prototype.prefix = Const.prototype.toString;

// Variable

const Variable = function(val) {
	this.val = val;
	this.index = Variable.VARIABLES[val];
};
Variable.VARIABLES = {
	"x": 0,
	"y": 1,
	"z": 2
};
Variable.prototype.evaluate = function(...vars) { return vars[this.index]};
Variable.prototype.diff = function(t) {
	return (t === this.val ? Const.CONSTANTS.one : Const.CONSTANTS.zero);
}
Variable.prototype.toString = function() { return this.val};
Variable.prototype.prefix = Variable.prototype.toString;

// other operations

const Operation = function(...args) {
	this.args = args;
};
Operation.prototype.preEvaluate = function(...vars) {
	return this.args.map((exp) => exp.evaluate(...vars));
};
Operation.prototype.evaluate = function(...vars) {
	return this.calc(...this.preEvaluate(...vars));
};
Operation.prototype.diff = function(t) {
	return this.howDiff(t, ...this.args);
}
Operation.prototype.toString = function() {
	let cur = this.args.map((tmp) => tmp.toString());
	return cur.join(' ') + ' ' + this.token;
};
Operation.prototype.prefix = function() {
	let cur = this.args.map((tmp) => tmp.toString());
	return '(' + this.token + ' ' + cur.join(' ') + ')';
};
let OPERATIONS = {
};
const makeOperation = (calc, howDiff, token, varCount) => {
	let Op = function(...args) {
		Operation.call(this, ...args);
	}
	Op.prototype = Object.create(Operation.prototype);
	Op.prototype.token = token;
	Op.varCount = varCount;
	Op.prototype.calc = calc;
	Op.prototype.howDiff = howDiff;
	Op.prototype.constructor = Op;
	OPERATIONS[token] = Op;
	return Op;
};
const Add = makeOperation(
	(a, b) => a + b,
	(t, a, b) => new Add(a.diff(t), b.diff(t)),
	"+",
	2);
const Subtract = makeOperation(
	(a, b) => (a - b),
	(t, a, b) => new Subtract(a.diff(t), b.diff(t)),
	"-",
	2);
const Multiply = makeOperation(
	(a, b) => (a * b),
	(t, a, b) => new Add(
		new Multiply(a, b.diff(t)),
		new Multiply(a.diff(t), b)),
	"*",
	2);
const Divide = makeOperation(
	(a, b) => (a / b),
	(t, a, b) => new Divide(
		new Subtract(
			new Multiply(a.diff(t), b),
			new Multiply(a, b.diff(t))),
		new Multiply(b, b)),
	"/",
	2);
const Negate = makeOperation(
	(a) => (-a),
	(t, a) => new Negate(a.diff(t)),
	"negate",
	1);
const Gauss = makeOperation(
	(a, b, c, x) => (a * Math.exp(-(x - b) * (x - b) / (2 * c * c))),
	(t, a, b, c, x) => {
		let subxb = new Subtract(x, b);
		return new Add(
			new Multiply(
				a.diff(t),
				new Gauss(Const.CONSTANTS.one, b, c, x)
			),
			new Multiply(
				new Gauss(a, b, c, x),
				new Negate(
					new Divide(
						new Multiply(subxb, subxb),
						new Multiply(Const.CONSTANTS.two, new Multiply(c, c))
					).diff(t)
				)
			)
		)
	},
	"gauss",
	4);

// parser

const getTokens = (s) => s.split(' ').filter((token) => (token.length > 0));
const parse = (input) => {
	return getTokens(input).reduce(
		(stack, token) => {
			if (token in OPERATIONS) {
				let op = OPERATIONS[token];
				let suffix = stack.splice(
					stack.length - op.varCount
				);
				stack.push(new op(...suffix));
			} else if (token in Variable.VARIABLES) {
				stack.push(new Variable(token));
			} else if (token in Const.CONSTANTS) {
				stack.push(Const.CONSTANTS[token]);
			} else {
				// it's a number
				stack.push(new Const(parseFloat(token)));
			}
			return stack;
		},
		[]
	).pop();
};

// parsePrefix

const parserErrors = (() => {
	const makeError = function(name) {
		let cur = function(message) {
			this.message = message;
		}
		cur.prototype = Object.create(Error.prototype);
		cur.prototype.name = name;
		cur.prototype.constructor = cur;
		return cur;
	}
	const UnexpectedTokenError = makeError("UnexpectedTokenError");
	const InvalidTokenError = makeError("InvalidTokenError");
	return {
		"UnexpectedTokenError": UnexpectedTokenError,
		"InvalidTokenError": InvalidTokenError
	}
})()

const parsePrefix = function(input) {
	let InvalidTokenError = parserErrors.InvalidTokenError
	let UnexpectedTokenError = parserErrors.UnexpectedTokenError
	let getTokenizer = function(source) {
		let pos = 0;
		let lastToken;
		let test = (c) => {
			if (pos < source.length && source[pos] == c) {
				pos++;
				return true;
			}
			return false;
		};
		let skipWhitespaces = () => {
			while (test(' ')) {
				// skip
			}
		}
		let getPrefixToken = () => {
			let end = pos;
			while (end < source.length && source[end] != '(' && source[end] != ')' && source[end] != ' ') {
				end++;
			}
			let ret = source.substr(pos, end - pos);
			pos = end;
			return ret;
		}
		return {
			"getNext": () => {
				skipWhitespaces();
				if (test('(')) {
					return lastToken = '(';
				}
				if (test(')')) {
					return lastToken = ')';
				}
				let token = getPrefixToken();
				return lastToken = (token.length > 0 ? token : '\n');
			},
			"getCurrentPrefix": () => source.substr(0, pos),
			"getCurrentToken": () => lastToken
		}
	}
	let tokenizer = getTokenizer(input);
	const parseExpression = () => {
		if (tokenizer.getCurrentToken() == '(') {
			let op = tokenizer.getNext();
			if (op in OPERATIONS) {
				op = OPERATIONS[op];
			} else {
				throw new UnexpectedTokenError("Unexpected operator.\n" + tokenizer.getCurrentPrefix() + "<---Error");
			}
			tokenizer.getNext();
			let acc = [];
			for (let i = 0; i < op.varCount; i++) {
				acc.push(parseExpression());
			}
			if (tokenizer.getCurrentToken() == ')') {
				tokenizer.getNext();
				return new op(...acc);
			} else {
				throw new UnexpectedTokenError("Expected close bracket.\n" + tokenizer.getCurrentPrefix() + "<---Error");
			}
		} else {
			return parseTerm();
		}
	}
	const parseTerm = () => {
		let cur = tokenizer.getCurrentToken();
		let ret;
		if (cur in Const.CONSTANTS) {
			ret = Const.CONSTANTS[cur];
		} else if (cur in Variable.VARIABLES) {
			ret = new Variable(cur);
		} else {
			let tmp = Number(cur);
			if (isNaN(tmp)) {
				throw new InvalidTokenError("Expected number or variable.\n" + tokenizer.getCurrentPrefix() + "<---Error");
			} else {
				ret = new Const(tmp);
			}
		}
		tokenizer.getNext();
		return ret;
	}

	tokenizer.getNext();
	let ret = parseExpression();
	if (tokenizer.getCurrentToken() != '\n') {
		throw new UnexpectedTokenError("expected no tokens, found one.\n" + tokenizer.getCurrentPrefix() + "<---Error");
	}
	return ret;
}

let exp = parsePrefix("(+ x x)")
console.log(exp.prefix())
// console.log(exp.evaluate(1, 2, 3))