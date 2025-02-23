#!/usr/bin/env node
import {createEntity, type RawType, type EnkoreNodeAPIOptions, type EnkoreAutogeneratedFile} from "@enkore/spec"
import {enkore} from "#~src/public/enkore.mts"

const args = process.argv.slice(2)

let isCIEnvironment = false
let force = false
let onlyInitializeProject = false
let partialBuild = false
let projectRoot : string|null = null

for (const arg of args) {
	if (arg === "-force") {
		force = true
	} else if (arg === "-ci") {
		isCIEnvironment = true
	} else if (arg === "-init") {
		onlyInitializeProject = true
	} else if(arg === "-debugPartialBuild") {
		partialBuild = true
	} else {
		projectRoot = arg
	}
}

if (projectRoot === null) {
	throw new Error(`project root must be specified.`)
}

function defineOptions(options: RawType<EnkoreNodeAPIOptions>) {
	return createEntity("EnkoreNodeAPIOptions", 0, 0, options)
}

const {project} = await enkore(
	projectRoot, defineOptions({
		stdIOLogs: true,
		force,
		onlyInitializeProject,
		isCIEnvironment,
		partialBuild
	})
)

const {messages} = await project.build()

//for (const message of messages) {
//	process.stderr.write(
//		`${message.step}: ${message.severity}: ${message.message}\n`
//	)
//}

export const index = 1
