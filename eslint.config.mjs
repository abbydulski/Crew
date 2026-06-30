import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/generated/**'] },
  {
    rules: {
      // React 19's new strict rule flags the standard `fetch().finally(() => setLoading(false))`
      // pattern used throughout this codebase for initial data loads. Disabled intentionally.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
