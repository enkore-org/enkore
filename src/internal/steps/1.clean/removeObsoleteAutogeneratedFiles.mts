import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import {scandir, readFileInChunks, remove} from "@aniojs/node-fs"
import path from "node:path"
import {autogeneratedFileMarkerUUID} from "@enkore/spec/uuid"
import {debugPrint} from "#~src/internal/session/debugPrint.mts"

export async function removeObsoleteAutogeneratedFiles(
	session: InternalSession
) {
	const projectFiles = await scandir(
		path.join(session.projectRoot, "project"), {
			filter(entry) {
				return entry.type === "regularFile"
			}
		}
	)

	for (const projectFile of projectFiles) {
		const absolutePath = projectFile.absolute_path
		const relativePath = projectFile.relative_path

		const tmp = await readFileInChunks(absolutePath, 512)
		const chunk = await tmp.readNextChunk()

		if (chunk === false) continue

		const firstChunkString = chunk.toString()

		if (!firstChunkString.includes(autogeneratedFileMarkerUUID)) continue

		if (session.state.filesToAutogenerate.has(relativePath)) continue

		debugPrint(session, `removing obsolete autogenerated file '${projectFile.relative_path}'`)

		await remove(absolutePath)
	}
}
