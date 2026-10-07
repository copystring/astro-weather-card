import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/astro-weather-card.js',
  output: [
    {
      file: 'dist/astro-weather-card.js',
      format: 'es',
      sourcemap: false
    },
    {
      file: 'astro-weather-card.js',
      format: 'es',
      sourcemap: false
    }
  ],
  plugins: [
    resolve(),
    terser({
      format: {
        comments: false
      }
    })
  ]
};
