type ObjectWithRandomString = Record<string, unknown> & {
  randomString: string;
};

module.exports = {
  test(value: unknown): value is string | ObjectWithRandomString {
    return (
      (typeof value === 'string' && !value.includes('HASH-REPLACED')) ||
      (typeof value === 'object' &&
        value !== null &&
        'randomString' in value &&
        value.randomString !== 'RANDOM-STRING-REPLACED')
    );
  },
  serialize(
    value: string | ObjectWithRandomString,
    config: Record<string, unknown>,
    indentation: string,
    depth: number,
    refs: unknown[],
    printer: (val: unknown, ...args: unknown[]) => string
  ): string {
    // Handle objects with randomString property
    if (
      typeof value === 'object' &&
      value !== null &&
      'randomString' in value
    ) {
      const modifiedValue = { ...value };
      modifiedValue.randomString = 'RANDOM-STRING-REPLACED';
      return printer(modifiedValue, config, indentation, depth, refs);
    }

    // Handle zip file strings and docker image hashes
    if (typeof value === 'string') {
      return `"${value
        .replace(/([A-Fa-f0-9]{64}.zip)/, 'HASH-REPLACED.zip')
        .replace(
          /(container-assets-\d+-[^:]+:)[A-Fa-f0-9]{64}/,
          '$1HASH-REPLACED'
        )}"`;
    }

    return printer(value, config, indentation, depth, refs);
  },
};
