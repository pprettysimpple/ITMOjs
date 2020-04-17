"use strict";

// operations
const cnst = c => () => c;
const getI = i => (...args) => args[i];
const VARIABLES = {
	"x": getI(0),
	"y": getI(1),
	"z": getI(2)
};
const one = cnst(1);
const two = cnst(2);
const CONSTANTS = {
  "one": one,
  "two": two
};

const variable = (s) => VARIABLES[s];
const getOperation = (operation) => {
	let cur = (...operands) => (...args) => operation(...operands.map((exp) => exp(...args)));
	cur.size = operation.length;
	return cur;
}
const add = getOperation((a, b) => a + b);
const subtract = getOperation((a, b) => a - b);
const multiply = getOperation((a, b) => a * b);
const divide = getOperation((a, b) => a / b);
const negate = getOperation(a => -a);
const abs = getOperation(Math.abs);
const iff = getOperation((a, b, c) => a >= 0 ? b : c);

// parser
const OPERATIONS = {
	"+": add,
	"-": subtract,
	"*": multiply,
	"/": divide,
	"negate": negate,
	"iff": iff,
	"abs": abs
};
function parse(input) {
	return input.split(' ').filter(token => token.length > 0).reduce(
		(stack, token) => {
			if (token in OPERATIONS) {
				let op = OPERATIONS[token];
				let suffix = stack.splice(stack.length - op.size);
				stack.push(op(...suffix));
			} else if (token in VARIABLES) {
				stack.push(VARIABLES[token]);
			} else if (token in CONSTANTS) {
				stack.push(CONSTANTS[token]);
			} else {
				// it's a number
				stack.push(cnst(parseFloat(token)));
			}
			return stack;
		},
		[]
	).pop();
}

// let expr = abs(add(subtract(cnst(1), cnst(2)), variable('x')));
// console.log(expr(-7, 2, 3));