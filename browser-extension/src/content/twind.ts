// using twind for hot reloading in shadow dom and encapsulation
// twind is not exactly tailwind but we are trying to get
// as close as possible with this config
// @see https://twind.style/

import { defineConfig } from '@twind/core';
import presetAutoprefix from '@twind/preset-autoprefix';
import presetTailwind from '@twind/preset-tailwind';

import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';
const fullConfig = resolveConfig(tailwindConfig);

export const config = defineConfig({
  ...fullConfig,
  presets: [presetAutoprefix(), presetTailwind()],
});

export * from '@twind/core';
