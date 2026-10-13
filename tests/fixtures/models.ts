import { transformGraphData } from '@/features/gocam/services/graphServices'
import type { GraphModel } from '@/features/gocam/models/cam'
import { saeModelRaw } from './saeModel'
import actsUpstreamPair from './raw/models/acts-upstream-pair.json'
import mfWithBpExtension from './raw/models/mf-with-bp-extension.json'
import singleMf from './raw/models/single-mf.json'
import gocamMixed from './raw/models/gocam-mixed.json'

/** Real barista-dev m3Batch `data` payloads (see raw/models/README.md). */
export const actsUpstreamPairRaw = actsUpstreamPair
export const mfWithBpExtensionRaw = mfWithBpExtension
export const singleMfRaw = singleMf
export const gocamMixedRaw = gocamMixed

export { saeModelRaw }

/** A fresh transformed model per call, so tests can mutate freely. */
export const loadModel = (raw: unknown): GraphModel =>
  transformGraphData(JSON.parse(JSON.stringify(raw)))
