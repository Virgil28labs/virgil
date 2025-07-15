const tsJest = require('ts-jest');

// Create the base transformer
const tsJestTransformer = tsJest.default.createTransformer({
  tsconfig: {
    jsx: 'react-jsx',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    moduleResolution: 'node',
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    allowJs: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true
  }
});

module.exports = {
  process(src, filename, config, options) {
    // Replace import.meta.env with process.env before processing with ts-jest
    const modifiedSrc = src.replace(/import\.meta\.env/g, 'process.env');
    
    // Process the modified source with ts-jest
    return tsJestTransformer.process(modifiedSrc, filename, config, options);
  },
  
  getCacheKey(fileData, filePath, configStr, options) {
    return tsJestTransformer.getCacheKey(fileData, filePath, configStr, options);
  }
};