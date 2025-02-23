import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {EnkoreBoilerplateFile} from "@enkore/spec"
import {getBoilerplateFiles} from "#~src/internal/getBoilerplateFiles.mts"
import path from "node:path"
import {isFileSync, writeAtomicFile} from "@aniojs/node-fs"

async function handleBoilerplateFile(
	session: InternalSession, file: EnkoreBoilerplateFile
) {
	const overwrite = file.overwrite === true

	const absolutePath = path.join(session.projectRoot, file.path)

	if (isFileSync(absolutePath) && !overwrite) return

	await writeAtomicFile(
		absolutePath, file.content, {
			createParents: true,
			mode: file.fileIsExecutable === true ? 0o777 : 0o666
		}
	)
}

export async function writeBoilerplateFiles(
	session: InternalSession
) {
	let boilerplateFiles: EnkoreBoilerplateFile[] = [
		...getBoilerplateFiles()
	]

	const getRealmBoilerplateFiles = session.realmIntegrationAPI.getBoilerplateFiles

	if (typeof getRealmBoilerplateFiles === "function") {
		boilerplateFiles = [
			...boilerplateFiles,
			...await getRealmBoilerplateFiles(session.publicAPI)
		]
	}

	for (const file of boilerplateFiles) {
		await handleBoilerplateFile(session, file)
	}
}
