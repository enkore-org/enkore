import type {API} from "#~src/API.d.mts"
import type {Events} from "#~src/internal/Events.d.mts"

import {readEnkoreConfigFile} from "@enkore/common"
import {createEventEmitter} from "@aniojs/event-emitter"
import {loadEnkoreCoreAPI} from "#~src/internal/loadEnkoreCoreAPI.mts"
import {createSession} from "#~src/internal/createSession.mts"
import {init} from "#~src/internal/steps/0.init/index.mts"
import {build} from "#~src/internal/steps/build.mts"

import type {EnkoreCoreRealmDependency} from "@enkore/spec"

const impl : API["enkore"] = async function(
	projectRoot,
	options?
) {
	const stdIOLogs = options?.stdIOLogs === true
	const isCIEnvironment = options?.isCIEnvironment === true
	const npmBinaryPath = options?.npmBinaryPath || "npm"
	const force = options?.force === true
	const onlyInitializeProject = options?.onlyInitializeProject === true

	const {
		on,
		_emitEvent,
		removeEventListener
		// "error" event should relate to BUILD errors
		// i.e. error events are dispatched and a flag is set
		// to make enkore terminate with an error condition (it doesn't immediately terminate execution!!)
	} = createEventEmitter<Events>(["message", "warning"])

	const projectConfig = await readEnkoreConfigFile(projectRoot)
	const core = await loadEnkoreCoreAPI(projectRoot)

	const realmIntegrationAPI = await core.initializeProject(
		projectRoot, isCIEnvironment, {
			npmBinaryPath,
			force
		}
	)

	if (stdIOLogs) {
		on("warning", (e) => {
			process.stderr.write(
				`[warn] enkore: ${e.message}\n`
			)
		})
	}

	//
	// preload all realm dependencies
	//
	const realmDependencyNames = await core.getInstalledRealmDependencyNames(
		projectRoot, projectConfig.realm.name
	)

	const realmDependencies : Map<string, EnkoreCoreRealmDependency> = new Map()

	for (const dependencyName of realmDependencyNames) {
		realmDependencies.set(
			dependencyName,
			await core.loadRealmDependency(
				projectRoot,
				projectConfig.realm.name,
				dependencyName
			)
		)
	}

	const internalSession = await createSession(
		projectRoot,
		projectConfig,
		realmIntegrationAPI,
		realmDependencies,
		_emitEvent,
		{
			force,
			isCIEnvironment,
			stdIOLogs,
			npmBinaryPath,
			onlyInitializeProject
		},
		core.getDebugMode()
	)

	//
	// give realm a chance to register auto files
	//
	realmIntegrationAPI.preInitialize(internalSession.publicAPI)

	//
	// add auto files from config to session
	//
	if (projectConfig.autogeneratedFiles) {
		for (const file of projectConfig.autogeneratedFiles) {
			internalSession.publicAPI.addAutogeneratedFile(file)
		}
	}

	return {
		project: {
			on,
			removeEventListener,
			init: async function() {
				return await init(internalSession)
			},

			build: async function() {
				return await build(internalSession)
			}
		},

		session: internalSession.publicAPI
	}
}

export const enkore = impl
