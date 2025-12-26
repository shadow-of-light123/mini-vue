// 这个文件会帮我们打包 packages 下的模块， 最终打包出js文件

// node dev.js (要打包的模块名 -f 打包的格式) === argv.slice(2)

import minimist from 'minimist'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import esbuild from 'esbuild'

// node中的命令行参数通过process.argv获取
// process.argv[0] === 'node'
// process.argv[1] === 'dev.js'
// process.argv[2] === 'reactivity'
// process.argv[3] === '-f'
// process.argv[4] === 'esm'
const args = minimist(process.argv.slice(2))

// __filename 是当前模块的文件名， __dirname 是当前模块的目录名
// fileURLToPath 是一个函数，用于将 file url 转换为 path
const __filename = fileURLToPath(import.meta.url)
// dirname 是一个函数，用于获取路径的目录名
const __dirname = dirname(__filename)

// 兼容性处理：createRequire 是一个函数，用于创建一个 require 函数
const require = createRequire(import.meta.url)

// args._ 是 minimist 库的一个特殊属性，用于存储所有未被解析为选项的参数
// 所以 args._[0] 就是我们要打包的项目名
const target = args._[0] || 'reactivity'

// args.f 就是我们要打包的模块化规范
const format = args.f || 'iife'

// entry 是我们要打包的入口文件
// resolve 是一个函数，用于将路径解析为绝对路径
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`))

// context 是一个函数，用于创建一个上下文对象
// 上下文对象可以用于后续的打包操作
esbuild
  .context({
    entryPoints: [entry], // TypeScript入口文件
    outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 出口文件
    bundle: true, // reactivity -> shared  会打包到一起
    platform: 'browser', // 打包后给浏览器使用
    sourcemap: true, // 可以调试源代码
    format: 'esm', // cjs esm iife
    globalName: pkg.buildOptions?.globalName, // 打包后的全局变量名
  })
  .then((ctx) => {
    console.log('start dev')

    return ctx.watch() // 监听入口文件持续进行打包处理
  })
