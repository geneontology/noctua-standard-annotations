/**
 * How many annotations one "delete selected" may cover (#96).
 *
 * The whole selection goes to Minerva as one m3Batch call, and a large batch is
 * slow enough to look hung — as in the VPE, which caps its multi-node delete.
 */
export const MAX_BULK_DELETE = 13
