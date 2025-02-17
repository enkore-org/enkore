import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {Clean} from "../Steps.d.mts"
import {removeObsoleteAutogeneratedFiles} from "./removeObsoleteAutogeneratedFiles.mts"
import {remove, mkdirp} from "@aniojs/node-fs"
import path from "node:path"
import {autogenerate} from "../autogenerate/index.mts"

export async function clean(
	session: InternalSession
) : Promise<Clean> {
	await removeObsoleteAutogeneratedFiles(session)

	await remove(path.join(session.projectRoot, ".build"))
	await mkdirp(path.join(session.projectRoot, ".build"))

	await remove(path.join(session.projectRoot, ".objects"))
	await mkdirp(path.join(session.projectRoot, ".objects"))

	await remove(path.join(session.projectRoot, "dist"))

	return {
		autogenerate: async function() {
			return await autogenerate(session)
		},
		messages: []
	}
}
