import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {Autogenerate} from "../Steps.d.mts"
import {createAutogeneratedFiles} from "./createAutogeneratedFiles.mts"
import {scandir} from "@aniojs/node-fs"
import path from "node:path"
import {preprocess} from "../3.preprocess/index.mts"

export async function autogenerate(
	session: InternalSession
) : Promise<Autogenerate> {
	await createAutogeneratedFiles(session)

	session.projectDirectoryEntries = await scandir(
		path.join(session.projectRoot, "project")
	)

	return {
		preprocess: async function() {
			return await preprocess(session)
		},
		messages: []
	}
}
