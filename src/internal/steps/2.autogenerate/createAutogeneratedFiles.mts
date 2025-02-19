import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import path from "node:path"
import {writeAtomicFile} from "@aniojs/node-fs"
import {autogeneratedFileMarkerUUID} from "@enkore/spec/uuid"
import {createHash} from "node:crypto"
import {debugPrint} from "#~src/internal/session/debugPrint.mts"

function hashString(str: string) {
	return createHash("sha256").update(str).digest("hex")
}

function autogeneratedFileHeader(fileName: string) {
	let header = ``

	function comment(str: string) {
		const isHTMLLike = fileName.endsWith(".html") || fileName.endsWith(".svg")

		return isHTMLLike ? `<!-- ${str} -->\n` : `// ${str}\n`
	}

	header += comment(autogeneratedFileMarkerUUID)

	const lines = [
		`888       888        d8888 8888888b.  888b    888 8888888 888b    888  .d8888b. `,
		`888   o   888       d88888 888   Y88b 8888b   888   888   8888b   888 d88P  Y88b`,
		`888  d8b  888      d88P888 888    888 88888b  888   888   88888b  888 888    888`,
		`888 d888b 888     d88P 888 888   d88P 888Y88b 888   888   888Y88b 888 888       `,
		`888d88888b888    d88P  888 8888888P"  888 Y88b888   888   888 Y88b888 888  88888`,
		`88888P Y88888   d88P   888 888 T88b   888  Y88888   888   888  Y88888 888    888`,
		`8888P   Y8888  d8888888888 888  T88b  888   Y8888   888   888   Y8888 Y88b  d88P`,
		`888P     Y888 d88P     888 888   T88b 888    Y888 8888888 888    Y888  "Y8888P88`,
		`NOTE: This file was generated automatically`,
		`DO NOT EDIT THIS FILE DIRECTLY`
	]

	header += lines.map(comment).join("")

	return `${header}`
}

export async function createAutogeneratedFiles(
	session: InternalSession
) {
	for (const [destinationPath, file] of session.state.filesToAutogenerate.entries()) {
		const depth = path.dirname(destinationPath).split(path.sep).length

		if (depth === 0) {
			throw new Error(
				`Invalid destinationPath '${destinationPath}'.`
			)
		}

		const code = await file.generator(
			session.publicAPI, destinationPath
		)

		file.output = code
		file.outputHash = hashString(code)

		debugPrint(session, `generating file '${destinationPath}'`)

		await writeAtomicFile(
			path.join(session.projectRoot, "project", destinationPath),
			autogeneratedFileHeader(
				path.basename(destinationPath)
			) + code
		)
	}
}
