import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      body: ['M PLUS Rounded 1c'],
    },
    extend: {
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      colors: {
        'aws-squid-ink': '#232F3E',
        'aws-anchor': '#003181',
        'aws-sky': '#2074d5',
        'aws-rind': '#FBD8BF',
        'aws-smile': '#ff9900',
        'aws-font-color': '#232F3E',
        'aws-font-color-gray': '#d4d4d8',
        'aws-ml': '#01A88D',
      },
      screens: {
        print: { raw: 'print' },
        screen: { raw: 'screen' },
      },
    },
  },
  plugins: [],
} as Config;
