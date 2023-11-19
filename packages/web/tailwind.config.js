/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
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
        'aws-ml': '#01A88D',
      },
      screens: {
        print: { raw: 'print' },
        screen: { raw: 'screen' },
      },
    },
  },
  // eslint-disable-next-line no-undef
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar'),
    require('@tailwindcss/forms'),
  ],
};
