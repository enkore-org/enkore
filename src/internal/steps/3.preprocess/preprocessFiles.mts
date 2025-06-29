import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import {isPreprocessableFileName, isFunction, isString} from "@anio-software/pkg.is"
import {readFileString, writeAtomicFile, copy, isFileSync} from "@aniojs/node-fs"
import {createEntity} from "@anio-software/enkore-private.spec"
import {getEmitFileMessage} from "#~src/internal/getEmitFileMessage.mts"
import path from "node:path"

function searchAndReplaceBuildConstants(
	session: InternalSession,
	code: string
): string {
	let newCode = code

	if (session.projectConfig.buildConstants) {
		for (const name in session.projectConfig.buildConstants) {
			const replaceWith = session.projectConfig.buildConstants[name]

			newCode = newCode.split(`%%${name}%%`).join(replaceWith)
		}
	}

	return newCode
}

type Preprocess = NonNullable<
	InternalSession["targetIntegrationAPI"]["preprocess"]
>

export async function preprocessFiles(
	session: InternalSession
) {
	const preprocess: Preprocess = async (publicSession, file, code, emitFileMessage) => {
		code = searchAndReplaceBuildConstants(session, code)

		if (isFunction(session.targetIntegrationAPI.preprocess)) {
			return await session.targetIntegrationAPI.preprocess(
				publicSession, file, code, emitFileMessage
			)
		}

		return code
	}

	for (const projectFile of session.state.allProjectFiles!) {
		const defaultDestinationFilePath = path.join(
			session.projectRoot,
			"build",
			projectFile.relativePath
		)

		//
		// don't preprocess file that aren't preprocessable, just copy them
		//
		if (!isPreprocessableFileName(projectFile.fileName)) {
			await copy(projectFile.absolutePath, defaultDestinationFilePath)

			continue
		}

		const emitFileMessage = getEmitFileMessage(session, projectFile.relativePath)
		const preprocessResult = await preprocess(
			session.publicAPI,
			projectFile,
			await readFileString(projectFile.absolutePath),
			emitFileMessage
		)

		if (isString(preprocessResult)) {
			await writeAtomicFile(defaultDestinationFilePath, preprocessResult)
		} else {
			const files = Array.isArray(
				preprocessResult
			) ? preprocessResult : [preprocessResult]

			for (const file of files) {
				let destinationPath = ""

				if ("name" in file) {
					destinationPath = path.join(
						path.dirname(projectFile.relativePath),
						file.name
					)
				} else {
					destinationPath = path.normalize(file.path)
				}

				await writeAtomicFile(
					path.join(session.projectRoot, "build", destinationPath),
					file.contents
				)

				//
				// if the destinationPath doesn't exist within project/
				// we assume it resides within build/
				// (that's also why they are called EnkoreBuildFile)
				//
				if (!isFileSync(
					path.join(session.projectRoot, "project", destinationPath))
				) {
					session.state.allBuildFiles.push(
						createEntity("EnkoreBuildFile", 0, 0, {
							fileName: path.basename(destinationPath),
							relativePath: destinationPath,
							absolutePath: path.join(
								session.projectRoot,
								"build",
								destinationPath
							)
						})
					)
				}
			}
		}
	}
}
