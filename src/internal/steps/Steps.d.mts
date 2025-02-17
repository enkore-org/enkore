import type {API} from "#~src/API.d.mts"

type R<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>

type Step<T> = Omit<T, "messages">

export type Init = Step<R<R<API["enkore"]>["project"]["init"]>>
export type Clean = Step<R<Init["clean"]>>
export type Autogenerate = Step<R<Clean["autogenerate"]>>
export type Preprocess = Step<R<Autogenerate["preprocess"]>>
export type Lint = Step<R<Preprocess["lint"]>>
export type Compile = Step<R<Lint["compile"]>>
export type BuildProducts = Step<R<Compile["buildProducts"]>>
