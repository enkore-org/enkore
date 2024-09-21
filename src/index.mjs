import createFourtuneSession from "./lib/init/createFourtuneSession.mjs"
import stages from "./stages/index.mjs"
import process from "node:process"

export default async function(project_root) {
	const saved_cwd = process.cwd()

	try {
		process.chdir(project_root)

		const fourtune_session = await createFourtuneSession(project_root)

		if ("preinit" in fourtune_session.project.config) {
			const {preinit} = fourtune_session.project.config

			if (!Array.isArray(preinit)) {
				throw new Error(
					`preinit must be an array of functions.`
				)
			}

			for (const fn of preinit) {
				await fn(
					fourtune_session.public_interface
				)
			}
		}

		await fourtune_session.initializeTarget()

		for (const stage of stages) {
			await stage(fourtune_session)
		}

		for (const warning of fourtune_session.project.warnings) {
			console.log(warning.id, warning.message)
		}
	} finally {
		process.chdir(saved_cwd)
	}
}
