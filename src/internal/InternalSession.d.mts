import type {
	EnkoreRealmIntegrationAPI,
	EnkoreSessionAPI,
	EnkoreConfig,
	RawType,
	EnkoreNodeAPIOptions
} from "@enkore/spec"

import type {Events} from "./Events.d.mts"
import type {Step} from "./Step.d.mts"
import type {_EmitEventType} from "@aniojs/event-emitter"

import type {InternalSessionState} from "./InternalSessionState.d.mts"

export type InternalSession = {
	state: InternalSessionState

	getCurrentStep: () => Step|undefined
	setCurrentStep: (step: Step) => undefined

	debugPrint: (message: string) => undefined

	options: Required<RawType<EnkoreNodeAPIOptions>>
	projectRoot: string
	projectConfig: EnkoreConfig
	realmIntegrationAPI: EnkoreRealmIntegrationAPI
	publicAPI: EnkoreSessionAPI
	emitEvent: _EmitEventType<Events>
}
