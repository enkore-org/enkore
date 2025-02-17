import type {InternalSession} from "../InternalSession.d.mts"
import type {EnkoreNodeAPIMessage} from "@enkore/spec"

import {init} from "./init/index.mts"

export async function build(
	session: InternalSession
) : Promise<{
	messages: EnkoreNodeAPIMessage[]
}> {
	const {clean} = await init(session)

	const {messages: cleanMessages, autogenerate} = await clean()

	const {messages: autogenerateMessages, preprocess} = await autogenerate()
	const {messages: preprocessMessages, lint} = await preprocess()
	const {messages: lintMessages, compile} = await lint()
	const {messages: compileMessages, buildProducts} = await compile()
	const {messages: buildProductsMessages} = await buildProducts(null)

	return {
		messages: [
			...cleanMessages,
			...autogenerateMessages,
			...preprocessMessages,
			...lintMessages,
			...compileMessages,
			...buildProductsMessages
		]
	}
}
