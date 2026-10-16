/** Model lifecycle states offered in Model Details (Angular `noctuaFormConfig.modelState`). */
export const MODEL_STATES = [
  { value: 'development', label: 'Development' },
  { value: 'production', label: 'Production' },
  { value: 'review', label: 'Review' },
  { value: 'closed', label: 'Closed' },
  { value: 'delete', label: 'Delete' },
  { value: 'internal_test', label: 'Internal Test' },
] as const
