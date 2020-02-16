const fs = require('fs')
const sh = require('shelljs')
const path = require('path')

const env = process.env.NODE_ENV
const isEnvDevelopment = env === 'development'
const isEnvTest = env === 'test'
const isEnvProduction = env === 'production'

const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath)

let packageJson
function getPackageJson() {
  packageJson = JSON.parse(fs.readFileSync(appDirectory + '/package.json'))
  return packageJson
}

function shellExec(com) {
  if (sh.exec(com).code !== 0) {
    sh.exit(1)
  }
}

const getLocalConfig = () => {
  let config = {}
  try {
    config = require(appDirectory + '/config/local')
  } catch (err) {
    // nothing
  }

  return config
}

const getConfig = () => {
  let config
  try {
    config = require(appDirectory + '/config/deploy')
  } catch (err) {
    throw new Error('没有找到 /config/deploy.js 文件')
  }

  // 开发默认 /build/
  if (isEnvDevelopment) {
    config.publicPath = '/build/'
  }

  // local 覆盖 deploy
  Object.assign(config, getLocalConfig())

  // 开发环境需要提供 publicPath
  if (!isEnvDevelopment && !config.publicPath) {
    throw new Error('production 没有提供 publicPath 字段')
  }

  return config
}

const PATH = {
  appDirectory,
  appBuild: resolveApp('build'),
  appIndexTemplate: resolveApp('config/index.html'),
  appSrc: resolveApp('src'),
  appIndexJs: resolveApp('src/index.js')
}
const { version } = getPackageJson()

const commandInclude = [PATH.appSrc, /gm-/]

module.exports = {
  isEnvDevelopment,
  isEnvTest,
  isEnvProduction,
  appDirectory,
  PATH,
  version,
  commandInclude,
  shellExec,
  getConfig
}