import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import {isFileSync, writeAtomicFile, readFileString} from "@aniojs/node-fs"
import {getGitIgnoredFiles} from "#~src/internal/getGitIgnoredFiles.mts"
import {gitIgnoreMarkerUUID} from "@enkore/spec/uuid"
import path from "node:path"

async function getAutoSection(
	session: InternalSession
) {
	const getRealmGitIgnoredFiles = session.realmIntegrationAPI.getGitIgnoredFiles
	let gitIgnoreFiles = [
		...getGitIgnoredFiles()
	]

	if (typeof getRealmGitIgnoredFiles === "function") {
		gitIgnoreFiles = [
			...gitIgnoreFiles,
			...await getRealmGitIgnoredFiles(session.publicAPI)
		]
	}

	gitIgnoreFiles.sort((a, b) => {
		return a.localeCompare(b, "en")
	})

	let section = ``

	section += `# Section managed by enkore ; DO NOT ADD ENTRIES AFTER THIS LINE! (${gitIgnoreMarkerUUID})\n`
	section += gitIgnoreFiles.join("\n")

	return section
}

export async function writeGitIgnoreFile(
	session: InternalSession
) {
	const autoSection = await getAutoSection(session)
	const gitIgnorePath = path.join(session.projectRoot, ".gitignore")

	if (!isFileSync(gitIgnorePath)) {
		session.emitMessage("info", "created .gitignore")

		await writeAtomicFile(gitIgnorePath, `# This file is partially managed by enkore
# Add your own files below this comment:



${autoSection}\n`)

		return
	}

	const currentGitIgnore = await readFileString(gitIgnorePath)
	const lines = currentGitIgnore.split("\n")
	let offset = -1

	for (let i = 0; i < lines.length; ++i) {
		if (lines[i].includes(gitIgnoreMarkerUUID)) {
			offset = i

			break
		}
	}

	if (offset === -1) {
		session.emitMessage("warning", "unable to find managed section inside .gitignore")

		return
	}

	let newGitIgnore = lines.slice(0, offset).join("\n")
	newGitIgnore += `\n${autoSection}\n`

	await writeAtomicFile(gitIgnorePath, newGitIgnore)
}
