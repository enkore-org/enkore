import type {InternalSession} from "#~src/internal/InternalSession.d.mts"
import type {Step} from "#~src/internal/Step.d.mts"
import type {NodeAPIMessage} from "@enkore/spec/primitives"

export function defineStep<
	StepFn extends (session: InternalSession, ...args: any[]) => any
>(
	stepName: Step,
	stepFn: StepFn
) {
	return {
		name: stepName,
		runStep: async function(
			...args: Parameters<StepFn>
		) : Promise<
			Awaited<ReturnType<StepFn>> & {
				messages: NodeAPIMessage[]
			}
		> {
			const session = args[0]
			let aggregatedMessages: NodeAPIMessage[] = []
			let eventListenerId: number|null = null

			try {
				session.state.currentStep = stepName

				eventListenerId = session.events.on("message", e => {
					aggregatedMessages.push(e)
				})

				return {
					...await stepFn(session, ...args.slice(1)),
					messages: aggregatedMessages
				}
			} finally {
				if (eventListenerId !== null) {
					session.events.removeListener(eventListenerId)
				}

				session.state.currentStep = undefined
			}
		}
	}
}
