import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {BuildProducts} from "../Steps.d.mts"

export async function buildProducts(
	session: InternalSession,
	productNames: string[]|null
) : Promise<BuildProducts> {
	return {
		messages: []
	}
}
