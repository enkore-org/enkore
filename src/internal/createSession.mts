import {
	type EnkoreConfig,
	type EnkoreRealmIntegrationAPI,
	type EnkoreCoreRealmDependency,
	type EnkoreNodeAPIOptions,
	type RawType,
	createAPI
} from "@enkore/spec"

import type {Events} from "./Events.d.mts"
import type {_EmitEventType} from "@aniojs/event-emitter"
import type {InternalSession} from "./InternalSession.d.mts"
import path from "node:path"

export async function createSession(
	projectRoot: string,
	projectConfig: EnkoreConfig,
	realmIntegrationAPI: EnkoreRealmIntegrationAPI,
	realmDependencies: Map<string, EnkoreCoreRealmDependency>,
	emitEvent: _EmitEventType<Events>,
	options: Required<RawType<EnkoreNodeAPIOptions>>
) : Promise<InternalSession> {
	const session : Omit<InternalSession, "publicAPI"> & {publicAPI: unknown} = {
		finalized: false,
		filesToAutoGenerate: new Map(),
		projectRoot,
		projectConfig,
		realmIntegrationAPI,
		emitEvent,
		projectDirectoryEntries: undefined,
		publicAPI: null,
		options,
		productNames: []
	}

	function assertNotFinalized() {
		if (session.finalized) {
			throw new Error(
				`Session data has been finalized, it is not possible to modify the session data.`
			)
		}
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
				}
			},

			addAutoGeneratedFile(file) {
				assertNotFinalized()

				const {destinationPath} = file
				const normalizedDestinationPath = path.normalize(destinationPath)

				if (normalizedDestinationPath.startsWith("/")) {
					throw new Error(
						`destinationPath may not be absolute.`
					)
				}

				if (session.filesToAutoGenerate.has(normalizedDestinationPath)) {
					// todo: use session.emit.warning()
					console.warn("duplicate auto generated file...")
				}

				session.filesToAutoGenerate.set(
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
