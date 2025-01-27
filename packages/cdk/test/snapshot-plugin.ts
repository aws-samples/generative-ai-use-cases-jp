module.exports = {
  test: (val: unknown) => typeof val === 'string',
  serialize: (val: string) => {
    return `"${val.replace(/([A-Fa-f0-9]{64}.zip)/, 'HASH-REPLACED.zip')}"`;
  },
};
