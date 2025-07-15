const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    // Transform import.meta.env to process.env
    function transformImportMetaEnv() {
      return {
        visitor: {
          MemberExpression(path) {
            if (
              path.node.object.type === 'MetaProperty' &&
              path.node.object.meta.name === 'import' &&
              path.node.object.property.name === 'meta' &&
              path.node.property.name === 'env'
            ) {
              path.replaceWith({
                type: 'MemberExpression',
                object: {
                  type: 'Identifier',
                  name: 'process'
                },
                property: {
                  type: 'Identifier',
                  name: 'env'
                }
              });
            }
          }
        }
      };
    }
  ]
});