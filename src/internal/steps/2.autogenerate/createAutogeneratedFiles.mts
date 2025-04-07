import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import path from "node:path"
import {writeAtomicFile, isFileSync} from "@aniojs/node-fs"
import {autogeneratedFileMarkerUUID} from "@enkore/spec/uuid"
import {createHash} from "node:crypto"
import {isAutogeneratedFile} from "#~src/internal/isAutogeneratedFile.mts"

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

	// this is here so the "autogenerated" header comment is assigned
	// to this statement instead of a user provided one
	//
	// (e.g. if the first statement in the file is "type A = string" then the
	// header comment would be associated with this type declaration, which
	// is something we don't want)
	if (fileName.endsWith(".mts")) {
		header += `void 0;\n\n`
	}

	return `${header}`
}

export async function createAutogeneratedFiles(
	session: InternalSession
) {
	for (const [_, file] of session.state.filesToAutogenerate.entries()) {
		const destinationPath = file.normalizedDestinationPath

		if (!destinationPath.startsWith("project/")) {
			throw new Error(`invalid destinationPath '${destinationPath}'.`)
		}

		const absoluteDestinationPath = path.join(
			session.projectRoot, destinationPath
		)

		//
		// make sure we don't overwrite a file that isn't autogenerated
		//
		if (isFileSync(absoluteDestinationPath)) {
			const destinationIsAutogenerated = await isAutogeneratedFile(
				absoluteDestinationPath
			)

			if (!destinationIsAutogenerated) {
				session.emitMessage(
					"error",
					"",
					`refusing to write to a file that is not marked as autogenerated.`
				)

				continue
			}
		}

		const code = await file.generator(
			session.publicAPI, destinationPath
		)

		file.output = code
		file.outputHash = hashString(code)

		session.emitMessage(
			"debug",
			`generating file '${destinationPath}'`
		)

		await writeAtomicFile(
			absoluteDestinationPath,
			autogeneratedFileHeader(
				path.basename(destinationPath)
			) + code,
			{
				createParents: true
			}
		)
	}
}
