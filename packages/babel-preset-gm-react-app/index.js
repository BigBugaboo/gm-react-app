module.exports = (api) => {
  api.assertVersion('^7.0.0')

  return {
    sourceType: 'unambiguous', // 自动推断编译的模块类型(cjs,es6)
    // 插件顺序从前往后
    plugins: [
      // decorators 需要再 class-properties 前
      [
        require('@babel/plugin-proposal-decorators'),
        {
          legacy: true,
        },
      ],
      [require('@babel/plugin-proposal-class-properties'), { loose: true }],
      require('@babel/plugin-proposal-function-bind'),
      require('@babel/plugin-proposal-object-rest-spread'),
      require('@babel/plugin-proposal-nullish-coalescing-operator'),
      require('@babel/plugin-proposal-optional-chaining'),
      require('@babel/plugin-syntax-dynamic-import'),
      require('@babel/plugin-transform-runtime'),
      require('react-hot-loader/babel'),
      require('styled-jsx/babel'),
    ],
    // 从后往前
    presets: [
      require('@babel/preset-react'),
      [
        require('@babel/preset-env'),
        {
          // for tree shaking
          modules: false,
        },
      ],
      require('@babel/preset-typescript'),
    ],
  }
}
