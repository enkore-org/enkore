import path from "node:path"
import {scandir, remove} from "@anio-software/fs"

export default async function(fourtune_session) {
	const files_that_will_be_autogenerated = fourtune_session.files_to_autogenerate.map(({file_path}) => file_path)

	const src_auto_folder_entries = await scandir(
		path.join(fourtune_session.project.root, "src", "auto")
	)

	const obsolete_files = src_auto_folder_entries.filter(({type, relative_path}) => {
		if (type !== "file") return false

		for (const file of files_that_will_be_autogenerated) {
			if (file === relative_path) {
				return false
			}
		}

		return true
	})

	const obsolete_directories = src_auto_folder_entries.filter(({type, relative_path}) => {
		if (type !== "dir") return false

		for (const file of files_that_will_be_autogenerated) {
			if (file.startsWith(`${relative_path}/`)) {
				return false
			}
		}

		return true
	})

	const items_to_be_removed = [
		...obsolete_files,
		...obsolete_directories
	]

	for (const {relative_path, absolute_path} of items_to_be_removed) {
		console.log(`\\---> removed obsolete auto file/dir src/auto/${relative_path}`)

		await remove(absolute_path)
	}
}
