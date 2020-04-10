"use strict";

// operations
const cnst = (c) => (() => c);
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
}
const variable = (s) => VARIABLES[s];
const getOperation = (operation) => (...operands) => (...args) => operation(...operands.map((exp) => exp(...args)));
const add = getOperation((a, b) => a + b);
const subtract = getOperation((a, b) => a - b);
const multiply = getOperation((a, b) => a * b);
const divide = getOperation((a, b) => a / b);
const negate = getOperation(a => -a);

// parser
const opInfo = function(type, size) {
	this.type = type;
	this.size = size;
}
const OPERATIONS = {
	"+": new opInfo(add, 2),
	"-": new opInfo(subtract, 2),
	"*": new opInfo(multiply, 2),
	"/": new opInfo(divide, 2),
	"negate": new opInfo(negate, 1)
}
const getTokens = (s) => s.split(' ').filter((token) => (token.length > 0));
const parse = (input) => {
	return getTokens(input).reduce(
		(stack, token) => {
			if (token in OPERATIONS) {
				let op = OPERATIONS[token];
				let suffix = stack.splice(
					stack.length - op.size
				);
				stack.push(op.type(...suffix));
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