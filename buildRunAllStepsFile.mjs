const enkoreSteps = [
	"preInit",
	"clean",
	"autogenerate",
	"preprocess",
	"init",
	"lint",
	"compile",
	"buildProducts"
]

function buildRunStep(step) {
	const stepIndex = enkoreSteps.indexOf(step)
	const nextStep = (enkoreSteps.length > stepIndex + 1) ? enkoreSteps[stepIndex + 1] : false

	const executeStep = (() => {
		if (step === "preInit") {
			return `preInit.runStep(session)`
		} else if (step === "buildProducts") {
			return `buildProducts(null)`
		}

		return `${step}()`
	})()

	let code = ``

	if (nextStep) {
		code += `\tconst {messages: ${step}Messages, ${nextStep}} = await ${executeStep}\n`
	} else {
		code += `\tconst {messages: ${step}Messages} = await ${executeStep}\n`
	}

	return code
}

export function buildRunAllStepsFile() {
	let code = `import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {NodeAPIMessage} from "@enkore/spec/primitives"
import type {Step} from "#~src/internal/Step.d.mts"

type ExtendedNodeAPIMessage = NodeAPIMessage & {
	step: string
}

import preInit from "#~src/internal/steps/0.preInit/index.mts"

export async function runAllSteps(
	session: InternalSession
): Promise<{
	messages: ExtendedNodeAPIMessage[]
}> {\n`

	for (const step of enkoreSteps) {
		code += buildRunStep(step)
	}

	code += `
	function map(step: Step, messages: NodeAPIMessage[]) {
		return messages.map(x => {
			return {...x, step}
		})
	}

	return {
		messages: [
${(() => {
	let code = ``

	for (const step of enkoreSteps) {
		code += `\t\t\t...map("${step}", ${step}Messages),\n`
	}

	return code.slice(0, -2)
})()}
		]
	}
`

	code += `}\n`

	return code
}
