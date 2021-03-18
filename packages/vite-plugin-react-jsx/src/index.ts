import {transformSync, ParserOptions} from '@babel/core';
import {Plugin} from 'vite';

import JSXSyntax from '@babel/plugin-syntax-jsx';
import JSXTransformReact from '@babel/plugin-transform-react-jsx';
import JSXTransformReactSelf from '@babel/plugin-transform-react-jsx-self';
import JSXTransformReactSource from '@babel/plugin-transform-react-jsx-source';

// @ts-expect-error
import JSXTransformSource from './jsx-source.js';

interface Options {
  runtime?: 'classic' | 'automatic';
  parserPlugins?: ParserOptions['plugins'];
}

function reactJSXSelfSourcePlugin(options: Options = {}): Plugin {
  const runtime = options.runtime ?? 'classic';
  let shouldSkip = false;
  return {
    name: 'react-jsx',
    enforce: 'pre',
    configResolved(config) {
      shouldSkip =
        config.command === 'build' ||
        (runtime === 'classic' && config.isProduction);
    },
    transform(code, id) {
      if (shouldSkip) {
        return;
      }

      // Only run the pipeline on first party javascript/typescript files
      if (!/\.(t|j)sx?$/.test(id) || id.includes('node_modules')) {
        return;
      }

      // Via https://github.com/vitejs/vite/blob/185a727715db4a011964cf0c48f998379a7b9ff1/packages/plugin-react-refresh/index.js#L72
      // TODO: must revisit, this condition may not be true
      // and we should probably do something with es-module-lexer instead
      // plain js/ts files can't use React without importing it, so skip
      // them whenever possible
      if (!id.endsWith('x') && !code.includes('react')) {
        return;
      }

      const isReasonReact = id.endsWith('.bs.js');
      console.log(runtime);
      const result = transformSync(code, {
        configFile: false,
        filename: id,
        parserOpts: {
          sourceType: 'module',
          allowAwaitOutsideFunction: true,
          plugins: [...(options?.parserPlugins ?? []), 'jsx', 'typescript']
        },
        plugins:
          runtime === 'classic'
            ? [
                JSXSyntax,
                JSXTransformReactSelf,
                JSXTransformReactSource,
                JSXTransformSource
              ]
            : [[JSXTransformReact, {runtime: 'automatic'}], JSXTransformSource],
        ast: !isReasonReact,
        sourceMaps: true,
        sourceFileName: id // TODO: match until closest package.json?
      })!;

      return {
        code: result.code!,
        map: result.map
      };
    }
  };
}

export default reactJSXSelfSourcePlugin;
