import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {BuildProducts} from "../Steps.d.mts"
import {defineStep} from "../defineStep.mts"

async function executeStep(
	session: InternalSession,
	productNames: string[]|null
) : Promise<BuildProducts> {
	const productNamesToBuild = productNames === null ? session.state.productNames : productNames

	for (const productName of productNamesToBuild) {
		session.debugPrint(`stage:buildProducts building '${productName}'`)

		await session.realmIntegrationAPI.generateProduct(
			session.publicAPI, productName
		)
	}

	return {
		messages: session.getAggregatedMessages()
	}
}

export default defineStep("buildProducts", executeStep)
