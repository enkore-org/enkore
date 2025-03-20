import fs from "node:fs/promises"
import path from "node:path"
import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {BuildProducts} from "#~synthetic/user/Steps.d.mts"
import {defineStepChecked} from "../defineStepChecked.mts"
import {remove} from "@aniojs/node-fs"

async function buildProduct(
	session: InternalSession,
	productName: string
) {
	const savedCWD = process.cwd()
	const productTmpPath = await session.core.createTemporaryDirectory(
		session.projectRoot
	)
	const productDestPath = path.join(
		session.projectRoot, "products", productName
	)

	process.chdir(productTmpPath)

	try {
		await session.realmIntegrationAPI.generateProduct(
			session.publicAPI, productName
		)

		await remove(productDestPath)
		await fs.rename(productTmpPath, productDestPath)
	} finally {
		process.chdir(savedCWD)
	}
}

const executeStep: BuildProducts = async function(session, productNames) {
	const productNamesToBuild = productNames ?? session.state.productNames

	for (const productName of productNamesToBuild) {
		session.emitMessage(
			"debug",
			`stage:buildProducts building '${productName}'`
		)

		await buildProduct(session, productName)
	}

	return {}
}

export default defineStepChecked("buildProducts", executeStep)
