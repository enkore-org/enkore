import {
	type EnkoreConfig,
	type EnkoreRealmIntegrationAPI,
	type EnkoreCoreRealmDependency,
	type EnkoreNodeAPIOptions,
	type RawType,
	createAPI,
	createEntity
} from "@enkore/spec"

import type {Events} from "./Events.d.mts"
import type {_EmitEventType, OnType, RemoveEventListenerType} from "@aniojs/event-emitter"
import type {InternalSession} from "./InternalSession.d.mts"
import type {InternalSessionState} from "./InternalSessionState.d.mts"
import path from "node:path"
import {getProjectFilesGeneric} from "./getProjectFilesGeneric.mts"

export async function createSession(
	projectRoot: string,
	projectConfig: EnkoreConfig,
	realmIntegrationAPI: EnkoreRealmIntegrationAPI,
	realmDependencies: Map<string, EnkoreCoreRealmDependency>,
	emitEvent: _EmitEventType<Events>,
	onEvent: OnType<Events>,
	removeEventListener: RemoveEventListenerType<Events>,
	options: Required<RawType<EnkoreNodeAPIOptions>>
) : Promise<InternalSession> {
	async function getInitialRealmData() {
		const {getInitialInternalData} = realmIntegrationAPI

		if (typeof getInitialInternalData === "function") {
			return await getInitialInternalData()
		}

		return {}
	}

	const state : InternalSessionState = {
		currentStep: undefined,
		filesToAutogenerate: new Map(),
		finalized: false,
		productNames: [],
		projectDirectoryEntries: undefined,
		allProjectFiles: undefined,
		filteredProjectFiles: undefined,
		internalRealmData: await getInitialRealmData()
	}

	const emitMessage : InternalSession["publicAPI"]["enkore"]["emitMessage"] = function(severity, arg1, arg2?) {
		if (arguments.length === 2) {
			emitEvent("message", {severity, id: undefined, message: arg1 as string})
		} else {
			emitEvent("message", {severity, id: arg1     , message: arg2 as string})
		}
	}

	const session : Omit<
		InternalSession,
		"publicAPI"
	> & {
		publicAPI: unknown
	} = {
		emitMessage,
		projectRoot,
		projectConfig,
		realmIntegrationAPI,
		publicAPI: null,
		options,
		state,
		events: {
			emit: emitEvent,
			on: onEvent,
			removeListener: removeEventListener
		}
	}

	function assertNotFinalized() {
		if (session.state!.finalized) {
			throw new Error(
				`Session data has been finalized, it is not possible to modify the session data.`
			)
		}
	}

	function checkAccessUninitializedStateVariable(propertyName: keyof InternalSessionState) {
		if (session.state[propertyName] === undefined) {
			session.emitMessage(
				"warning",
				"accessUninitializedStateVariable",
				`Trying to access an uninitialized session state variable '${propertyName}'.`
			)

			return false
		}

		return true
	}

	function getRealmDependency(dependencyName: string) {
		if (!realmDependencies.has(dependencyName)) {
			throw new Error(
				`No such realm dependency '${dependencyName}'.`
			)
		}

		return realmDependencies.get(dependencyName)!
	}

	session.publicAPI = createAPI(
		"EnkoreSessionAPI", 0, 0, {
			project: {
				root: projectRoot,
				config: projectConfig,
			},

			realm: {
				getConfig() {
					return projectConfig.realm.config
				},

				getDependency(dependencyName) {
					return getRealmDependency(dependencyName).importedDependencyObject
				},

				getDependencyVersion(dependencyName) {
					return getRealmDependency(dependencyName).version
				},

				getDependencyPath(dependencyName) {
					return getRealmDependency(dependencyName).path
				},

				getDependencyPackageJSON(dependencyName) {
					return getRealmDependency(dependencyName).dependencyPackageJSON
				},

				getInternalData() {
					return state.internalRealmData
				}
			},

			enkore: {
				getOptions() {
					return createEntity("EnkoreNodeAPIOptions", 0, 0, session.options)
				},
				emitMessage,
				getCurrentStep() {
					return session.state.currentStep
				},
				getProjectFiles(relativeBaseDir) {
					if (!checkAccessUninitializedStateVariable("filteredProjectFiles")) {
						return []
					}

					return getProjectFilesGeneric(
						relativeBaseDir, session.state.filteredProjectFiles!
					)
				},
				getAllProjectFiles(relativeBaseDir) {
					if (!checkAccessUninitializedStateVariable("allProjectFiles")) {
						return []
					}

					return getProjectFilesGeneric(
						relativeBaseDir, session.state.allProjectFiles!
					)
				},
			},

			addAutogeneratedFile(file) {
				assertNotFinalized()

				const {destinationPath} = file
				const normalizedDestinationPath = path.normalize(destinationPath)

				if (normalizedDestinationPath.startsWith("/")) {
					throw new Error(
						`destinationPath may not be absolute.`
					)
				}

				if (session.state!.filesToAutogenerate.has(normalizedDestinationPath)) {
					emitMessage(
						"warning",
						`there's already a file to be autogenerated at '${normalizedDestinationPath}'`
					)
				}

				session.state!.filesToAutogenerate.set(
					normalizedDestinationPath, {
						normalizedDestinationPath,
						generator: file.generator,
						output: undefined,
						outputHash: undefined
					}
				)
			}
		}
	)

	return session as InternalSession
}
