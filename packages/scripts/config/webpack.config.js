const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const safePostCssParser = require('postcss-safe-parser')
const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const {
  isEnvDevelopment,
  isEnvTest,
  isEnvProduction,
  version,
  commonInclude,
  PATH,
  getConfig
} = require('../util')

const appConfig = getConfig()

function getCss(options = { modules: false }) {
  return [
    isEnvDevelopment && require.resolve('style-loader'),
    !isEnvDevelopment && MiniCssExtractPlugin.loader,
    {
      loader: require.resolve('css-loader'),
      options: {
        modules: options.modules
      }
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        ident: 'postcss',
        plugins: () => [
          require('postcss-preset-env')({
            stage: 3
          })
        ]
      }
    }
  ]
}

// 以下配置综合参考 CRA 和 相关文章
let config = {
  mode: isEnvDevelopment ? 'development' : 'production',
  entry: [isEnvDevelopment && 'react-hot-loader/patch', PATH.appIndexJs].filter(
    Boolean
  ),
  // 暂时不启动 source-map
  devtool: isEnvDevelopment ? 'cheap-module-eval-source-map' : false,
  output: {
    path: PATH.appBuild,
    filename: isEnvDevelopment
      ? `js/bundle.js`
      : `js/[name].[contenthash:8].js`,
    chunkFilename: isEnvDevelopment
      ? 'js/[name].chunk.js'
      : 'js/[name].[contenthash:8].chunk.js',
    publicPath: appConfig.publicPath
  },
  optimization: {
    minimize: !isEnvDevelopment,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2
          },
          mangle: {
            safari10: true
          },
          keep_classnames: !isEnvDevelopment,
          keep_fnames: !isEnvDevelopment,
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        },
        sourceMap: true
      }),
      new OptimizeCSSAssetsPlugin({
        cssProcessorOptions: {
          parser: safePostCssParser,
          map: {
            // `inline: false` forces the sourcemap to be output into a
            // separate file
            inline: false,
            // `annotation: true` appends the sourceMappingURL to the end of
            // the css file, helping the browser find the sourcemap
            annotation: true
          }
        },
        cssProcessorPluginOptions: {
          preset: ['default', { minifyFontValues: { removeQuotes: false } }]
        }
      })
    ],
    splitChunks: {
      chunks: 'all'
    },
    runtimeChunk: 'single'
  },
  module: {
    rules: [
      {
        oneOf: [
          // 提高性能，只处理 /src，要处理 node_modules 自行添加
          {
            test: /\.js$/,
            include: commonInclude,
            loader: require.resolve('babel-loader'),
            options: {
              cacheDirectory: true,
              cacheCompression: false,
              compact: !isEnvDevelopment
            }
          },
          {
            test: /\.module\.css$/,
            use: [...getCss({ modules: true })].filter(Boolean)
          },
          {
            test: /\.css$/,
            use: [...getCss()].filter(Boolean)
          },
          {
            test: /\.module\.less$/,
            use: [
              ...getCss({ modules: true }),
              require.resolve('less-loader')
            ].filter(Boolean)
          },
          {
            test: /\.less$/,
            use: [...getCss(), require.resolve('less-loader')].filter(Boolean)
          },
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: require.resolve('url-loader'),
            options: {
              limit: 10000,
              name: 'media/image/[name].[hash:8].[ext]'
            }
          },
          {
            test: /\/svg\/(\w|\W)+\.svg$/,
            use: [
              {
                loader: '@svgr/webpack',
                options: {
                  icon: true,
                  expandProps: 'start',
                  svgProps: {
                    fill: 'currentColor',
                    // className 冗余
                    className:
                      "{'gm-svg-icon t-svg-icon ' + (props.className || '')}"
                  }
                }
              }
            ]
          },
          // iconfont 应该要废弃掉
          {
            test: /(fontawesome-webfont|glyphicons-halflings-regular|iconfont)\.(woff|woff2|ttf|eot|svg)($|\?)/,
            use: [
              {
                loader: require.resolve('url-loader'),
                options: {
                  limit: 10000,
                  name: 'media/font/[name].[hash:8].[ext]'
                }
              }
            ]
          }
          // new loader ? add here before file-loader

          // other assets
          // {
          //   loader: require.resolve('file-loader'),
          //   exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
          //   options: {
          //     name: 'media/file/[name].[hash:8].[ext]'
          //   }
          // }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEBUG__: isEnvDevelopment,
      __DEVELOPMENT__: isEnvDevelopment,
      __TEST__: isEnvTest,
      __PRODUCTION__: isEnvProduction,
      __VERSION__: JSON.stringify(version)
    }),
    new HtmlWebpackPlugin({
      template: PATH.appIndexTemplate,
      branch: process.env.GIT_BRANCH || 'none',
      commit: process.env.GIT_COMMIT || 'none',
      env: process.env.NODE_ENV || 'none'
    }),
    isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
    !isEnvDevelopment &&
      new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css',
        chunkFilename: 'css/[name].[contenthash:8].chunk.css'
      }),
    // scope hosting
    !isEnvDevelopment && new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  ].filter(Boolean),
  resolve: {
    alias: _.pickBy(
      {
        // yarn link 后保持 react 一致
        react:
          isEnvDevelopment &&
          path.resolve(PATH.appDirectory + '/node_modules/react'),
        'react-dom/server':
          isEnvDevelopment && require.resolve('@hot-loader/react-dom/server'),
        'react-dom':
          isEnvDevelopment && require.resolve('@hot-loader/react-dom'),
        common: PATH.appDirectory + '/src/js/common/',
        stores: PATH.appDirectory + '/src/js/stores/',
        svg: PATH.appDirectory + '/src/svg/',
        img: PATH.appDirectory + '/src/img/'
      },
      Boolean
    )
  },
  devServer: {
    disableHostCheck: true,
    compress: true,
    contentBase: PATH.appDirectory,
    hot: true,
    publicPath: appConfig.publicPath,
    historyApiFallback: {
      index: appConfig.publicPath + 'index.html'
    },
    host: '0.0.0.0',
    port: appConfig.port || 8080,
    proxy: appConfig.proxy || {},
    https: appConfig.https || false
  }
}

if (fs.existsSync(PATH.appConfig + '/webpack.config.js')) {
  config = require(PATH.appConfig + '/webpack.config.js')(config)
}

module.exports = config
