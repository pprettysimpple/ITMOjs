"use strict";

// Const

const Const = function(val) {
	this.val = val;
};

Const.zero = new Const(0);
Const.one = new Const(1);
Const.two = new Const(2);
Const.prototype.evaluate = function() { return this.val; };
Const.prototype.diff = () => Const.zero;
Const.prototype.toString = function() { return "" + this.val; };
Const.prototype.prefix = Const.prototype.toString;
Const.prototype.postfix = Const.prototype.toString;

// Variable

const Variable = function(val) {
	this.val = val;
	this.index = Variable[val];
};

Variable.x = 0;
Variable.y = 1;
Variable.z = 2;
Variable.prototype.evaluate = function(...vars) { return vars[this.index]};
Variable.prototype.diff = function(t) {
	return t === this.val ? Const.one : Const.zero;
};
Variable.prototype.toString = function() { return this.val};
Variable.prototype.prefix = Variable.prototype.toString;
Variable.prototype.postfix = Variable.prototype.toString;

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
};
Operation.prototype.toString = function() {
	return this.args.join(' ') + ' ' + this.token;
};
Operation.prototype.prefix = function() {
	let cur = this.args.map((tmp) => tmp.prefix());
	return '(' + this.token + ' ' + cur.join(' ') + ')';
};
Operation.prototype.postfix = function() {
	let cur = this.args.map((tmp) => tmp.postfix());
	return '(' + cur.join(' ') + ' ' + this.token + ')';
};
let OPERATIONS = {};
const makeOperation = (calc, howDiff, token, varCount) => {
	let Op = function(...args) {
		Operation.call(this, ...args);
	};
	Op.prototype = Object.create(Operation.prototype);
	Op.prototype.token = token;
	Op.varCount = calc.length;
	Op.prototype.calc = calc;
	Op.prototype.howDiff = howDiff;
	Op.prototype.constructor = Op;
	OPERATIONS[token] = Op;
	return Op;
};
const Add = makeOperation(
	(a, b) => a + b,
	(t, a, b) => new Add(a.diff(t), b.diff(t)),
	"+");
const Subtract = makeOperation(
	(a, b) => (a - b),
	(t, a, b) => new Subtract(a.diff(t), b.diff(t)),
	"-");
const Multiply = makeOperation(
	(a, b) => (a * b),
	(t, a, b) => new Add(
		new Multiply(a, b.diff(t)),
		new Multiply(a.diff(t), b)),
	"*");
const Divide = makeOperation(
	(a, b) => (a / b),
	(t, a, b) => new Divide(
		new Subtract(
			new Multiply(a.diff(t), b),
			new Multiply(a, b.diff(t))),
		new Multiply(b, b)),
	"/");
const Negate = makeOperation(
	(a) => (-a),
	(t, a) => new Negate(a.diff(t)),
	"negate");


const mean = (...args) => (
	args.length === 0 ? 0 : args.reduce((a, b) => a + b, 0) / args.length
);

// Mean
const Mean = makeOperation(
	mean,
	(t, ...args) => (new Mean(...args.map((x) => (x.diff(t))))),
	"mean");

// Var
const Var = makeOperation(
	(...args) => {
		const mn = mean(...args);
		return mean(...args.map((x) => (x - mn) * (x - mn)))},
	(t, ...args) => {
		const mn = new Mean(...args);
		const diffmn = new Mean(...args).diff(t);
		return new Multiply(
			Const.two,
			new Mean(
				...args.map(x => new Multiply(
					new Subtract(x, mn),
					new Subtract(x.diff(t), diffmn)))))},
	"var");


// Gauss
const Gauss = makeOperation(
	(a, b, c, x) => (a * Math.exp(-(x - b) * (x - b) / (2 * c * c))),
	function (t, a, b, c, x) {
		let subxb = new Subtract(x, b);
		return new Add(
			new Multiply(
				a.diff(t),
				new Gauss(Const.one, b, c, x)
			),
			new Multiply(
				this,
				new Negate(
					new Divide(
						new Multiply(subxb, subxb),
						new Multiply(Const.two, new Multiply(c, c))
					).diff(t)
				)
			)
		)
	},
	"gauss");

// parser from old HW

const getTokens = (s) => s.split(' ').filter((token) => (token.length > 0));
const parse = (input) => {
	return getTokens(input).reduce(
		(stack, token) => {
			if (token in OPERATIONS) {
				let op = OPERATIONS[token];
				let suffix = stack.splice(stack.length - op.varCount);
				stack.push(new op(...suffix));
			} else if (token in Variable) {
				stack.push(new Variable(token));
			} else if (token in Const) {
				stack.push(Const[token]);
			} else {
				// it's a number
				stack.push(new Const(parseFloat(token)));
			}
			return stack;
		},
		[]
	).pop();
};

// here is 8th HW in progress

// parsePrefix

const parserErrors = (() => {
	function ParsingError(message) {
		this.message = message;
	}
	ParsingError.prototype = Object.create(Error.prototype);
	ParsingError.prototype.name = "ParsingError";
	ParsingError.prototype.constructor = ParsingError;

	const makeError = function(name, par) {
		let cur = function(message) {
			this.message = message;
		};
		cur.prototype = Object.create(par.prototype);
		cur.prototype.name = name;
		cur.prototype.constructor = ParsingError;
		return cur;
	};
	const UnexpectedTokenError = makeError("UnexpectedTokenError", ParsingError);
	const InvalidTokenError = makeError("InvalidTokenError", ParsingError);
	return {
		"UnexpectedTokenError": UnexpectedTokenError,
		"InvalidTokenError": InvalidTokenError,
		"ParsingError": ParsingError
	}
})();

const PREFIX = true;
const POSTFIX = false;

const getParser = (mode) => function(input) {
	let InvalidTokenError = parserErrors.InvalidTokenError;
	let UnexpectedTokenError = parserErrors.UnexpectedTokenError;
	let ParsingError = parserErrors.ParsingError;
	let getTokenizer = function(source) {
		let pos = 0;
		let lastToken;
		let test = (c) => {
			if (pos < source.length && source[pos] === c) {
				pos++;
				return true;
			}
			return false;
		};
		let skipWhitespaces = () => {
			while (test(' ')) {
				// skip
			}
		};
		let getPrefixToken = () => {
			let end = pos;
			while (end < source.length && source[end] !== '(' && source[end] !== ')' && source[end] !== ' ') {
				end++;
			}
			let ret = source.substr(pos, end - pos);
			pos = end;
			return ret;
		};
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
			"getCurrentPrefix": () => source.substr(0, pos - lastToken.length),
			"getCurrentToken": () => lastToken,
			"END": () => '\n'
		}
	};

	let tokenizer = getTokenizer(input);

	const parseExpression = () => {
		if (tokenizer.getCurrentToken() === '(') {
			let acc = [];
			let op = {};
			const while_pred = function(pred) {
				tokenizer.getNext();
				while (pred() && tokenizer.getCurrentToken() !== tokenizer.END() &&
					tokenizer.getCurrentToken() !== ')') {
					acc.push(parseExpression());
				}
			}
			if (mode === PREFIX) {
				op = tokenizer.getNext();
				while_pred(() => (tokenizer.getCurrentToken() !== ')'));
			}
			if (mode === POSTFIX) {
				while_pred(() => (!(tokenizer.getCurrentToken() in OPERATIONS)));
				op = tokenizer.getCurrentToken();
				tokenizer.getNext();
			}
			if (!(op in OPERATIONS)) {
				throw new UnexpectedTokenError("Unexpected operator.\n" + tokenizer.getCurrentPrefix() + "<---Error");
			}
			op = OPERATIONS[op];
			if (op.varCount !== 0 && op.varCount !== acc.length) {
				throw new UnexpectedTokenError("Invalid arguments count. Expected " + op.varCount
				+ " but found " + acc.length + "\n" + tokenizer.getCurrentPrefix() + "<---Error");
			}
			if (tokenizer.getCurrentToken() !== ')') {
				throw new InvalidTokenError("Expected close bracket \")\" but found " + tokenizer.getCurrentToken()
				 + "\n" + tokenizer.getCurrentPrefix() + "<---Error");
			}
			tokenizer.getNext();
			return new op(...acc);
		} else {
			return parseTerm();
		}
	};

	const parseTerm = () => {
		let cur = tokenizer.getCurrentToken();
		let ret = undefined;
		if (cur in Const) {
			ret = Const[cur];
		} else if (cur in Variable) {
			ret = new Variable(cur);
		} else {
			let tmp = Number(cur);
			if (isNaN(tmp) || cur === '\n') {
				throw new InvalidTokenError("Expected number or variable.\n" + tokenizer.getCurrentPrefix() + "<---Error");
			} else {
				ret = new Const(tmp);
			}
		}
		tokenizer.getNext();
		return ret;
	};

	tokenizer.getNext();
	let ret = parseExpression(mode);
	if (tokenizer.getCurrentToken() !== '\n') {
		throw new UnexpectedTokenError("Found an extra token.\n" + tokenizer.getCurrentPrefix() + "<---Error");
	}
	return ret;
};

const parsePrefix = getParser(PREFIX);
const parsePostfix = getParser(POSTFIX);


// let exp = parsePostfix("(x x x)")
// console.log(exp.prefix())
// console.log(exp.evaluate(1, 2, 3))
// console.log(exp.postfix());
// console.log(exp.prefix());
// console.log(exp.toString());
// let expr = new Divide(new Negate(new Variable('x')), new Const(2))
// console.log(expr.prefix());
// let exp = parsePostfix('');

// exp.evaluate(1, 1, 1)
