/** @type {import('tailwindcss').Config} */
import Color from 'color';

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
    function ({ addUtilities, theme, e }) {
      const colorUtility = {
        '.text-color-auto': {
          color: 'var(--auto-text-color)',
        },
      };

      addUtilities(colorUtility);

      const backgroundColorUtilities = Object.entries(
        theme('backgroundColor')
      ).reduce((acc, [key, value]) => {
        if (key === 'DEFAULT') return acc;

        // 色の値が文字列で、'inherit'や'transparent'などの特殊なキーワードでない場合のみ処理
        if (
          typeof value === 'string' &&
          !['inherit', 'transparent', 'currentColor'].includes(value)
        ) {
          try {
            const color = Color(value);
            const textColor = color.isLight() ? '#000' : '#fff';

            acc[`.${e(`bg-${key}`)}`] = {
              '--auto-text-color': textColor,
            };
          } catch (error) {
            console.warn(`Unable to parse color: ${value}`);
          }
        }

        return acc;
      }, {});

      addUtilities(backgroundColorUtilities, ['responsive', 'hover']);
    },
  ],
};
