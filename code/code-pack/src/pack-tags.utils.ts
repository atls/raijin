const IMAGE_TAG_ALIAS_REGEXP = /^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$/

export const normalizeAdditionalTags = (tags: Array<string> = []): Array<string> => {
  for (const tag of tags) {
    if (!IMAGE_TAG_ALIAS_REGEXP.test(tag)) {
      throw new Error(`Invalid image tag alias "${tag}".`)
    }
  }

  return tags
}

export const getPackImageTags = (
  image: string,
  primaryTag: string,
  additionalTags: Array<string> = []
): Array<string> => [
  `${image}:${primaryTag}`,
  `${image}:latest`,
  ...normalizeAdditionalTags(additionalTags).map((tag) => `${image}:${tag}`),
]
