module.exports = {
	"env": {
		"browser": true,
		"node": true,
	},
	"globals": {
		"Map": "readonly",
		"BigInt": "readonly",
		"Uint8Array": "readonly",
		"ArrayBuffer": "readonly",
	},
	"extends": [
		"eslint:recommended",
		"standard",
	],
	"parserOptions": {
		"sourceType": "script",
		// note: ecmaVersion 3 could be used here but eslint has a problem with "delete" method for the Map object polyfill
		"ecmaVersion": 5,
	},
	"rules": {
		"dot-notation": 0,
		// TODO: switch to mostly using === in the code?
		"eqeqeq": 0,
		"indent": 0,
		"no-labels": 0,
		"no-multi-spaces": 0,
		"no-tabs": 0,
		"no-var": 0,
		"padded-blocks": 0,
		"space-before-function-paren": 0,
		"spaced-comment": 0,

		"consistent-return": "error",
		"curly": "error",
		"new-cap": ["error", { "newIsCap": true, "capIsNew": true }],
		"no-array-constructor": "error",
		"no-constant-binary-expression": "error",
		"no-constant-condition": ["error", { "checkLoops": false }],
		"no-constructor-return": "error",
		"no-eval": "error",
		"no-implied-eval": "error",
		"no-label-var": "error",
		"no-loop-func": "error",
		"no-mixed-operators": "error",
		"no-multi-assign": "error",
		"no-octal-escape": "error",
		"no-self-compare": "error",
		"no-sequences": "error",
		"no-shadow": "error",
		"no-trailing-spaces": "error",
		"no-unmodified-loop-condition": "error",
		"no-unused-private-class-members": "error",
		"no-use-before-define": ["error", { "functions": true, "classes": true, "variables": true }],
		"no-whitespace-before-property": "error",
		"one-var": ["error", "never"],
		"quote-props": "error",
		"semi": ["error", "always"],
		"space-before-blocks": "error",
		"strict": ["error", "global"],
		"yoda": "error",

		"no-fallthrough": "warn",
		"no-multiple-empty-lines": ["warn", { "max": 2 }],
		"no-self-assign": "warn",
		"no-unneeded-ternary": ["warn", { "defaultAssignment": true }],
		"no-unused-vars": ["warn", { "vars": "all", "args": "all" }],
		"quotes": ["warn", "double"],

		// TODO: remove the following lines when the warnings/errors they generate are cleaned up
		"new-cap": ["error", { "newIsCap": true, "capIsNew": false }],
		"no-unused-vars": 0,

	}
}
