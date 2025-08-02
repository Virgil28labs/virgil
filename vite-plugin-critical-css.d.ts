declare module 'vite-plugin-critical-css' {
  import { Plugin } from 'vite'
  
  interface CriticalCSSOptions {
    base?: string
    src?: string
    target?: string
    width?: number
    height?: number
    minify?: boolean
    extract?: boolean
    inlineThreshold?: number
    ignore?: string[]
  }
  
  function criticalCSS(options?: CriticalCSSOptions): Plugin
  export default criticalCSS
}