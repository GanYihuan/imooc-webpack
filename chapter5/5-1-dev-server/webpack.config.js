﻿const webpack = require('webpack')
const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineChunkPlugin = require('html-webpack-inline-chunk-plugin')
const PurifyCssWebpack = require('purifycss-webpack')
const UglifyJsWebpackPlugin = require('uglifyjs-webpack-plugin')
const path = require('path')
const globAll = require('glob-all')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CleanWebpackPlugin = require('clean-webpack-plugin')
const extractLess = new ExtractTextWebpackPlugin({
  filename: 'css/[name]-bundle-[hash:5].css'
})

module.exports = {
  mode: 'production',
  entry: {
    app: './src/app.js',
    // third-part package
    vendor: ['lodash']
  },
  output: {
    /* 输出到 dist 目录下 */
    path: path.resolve(__dirname, 'dist'),
    // 修改引入资源路径, 使其带有 '/' 前缀
    publicPath: '/',
    /* 初始化打包 */
    filename: 'js/[name]-bundle-[hash:5].js',
    /* 动态打包, 如异步引入的文件 */
    chunkFilename: '[name].bundle.js'
  },
  // webpack4 替代 webpack.optimize.CommonsChunkPlugin, 打包公共代码
  optimization: {
    // 适用于多 entry 情况
    splitChunks: {
      // name of the split chunk
      name: 'manifest',
      // which chunks will be selected for optimization, "initial" | "all"(default) | "async",
      // 指定提取范围
      chunks: 'initial',
      // mini size for a chunk to be generated.
      minSize: 30000,
      // mini number of chunks that must share a module before splitting.
      // 需要提取的公共代码出现的次数，出现 2 次提取到公共代码
      minChunks: 2,
      // 第三方模块与代码区分开提取
      // minChunks: Infinity,
      // max number of parallel requests when on-demand loading.
      maxAsyncRequests: 1,
      // max number of parallel requests at an entry point.
      maxInitialRequests: 1
    }
  },
  resolve: {
    /* Create alias to import or require certain modules more easily */
    alias: {
      /* 找到本地的 jquery */
      jquery$: path.resolve(__dirname, 'src/libs/jquery.min.js')
    }
  },
  /* 此选项控制是否生成，以及如何生成 source map */
  devtool: 'cheap-module-source-map',
  devServer: {
    /* browser page status bar. tell use package status */
    // inline: false,
    // Tell dev-server to watch the files served
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    // Specify a port number to listen for requests on
    port: 9001,
    // Shows full-screen overlay in the browser when there are compiler errors or warnings
    overlay: true,
    // Enable webpack's Hot Module Replacement feature
    hot: true,
    // Enables Hot Module Replacement without page refresh as fallback in case of build failures.
    hotOnly: true,
    /* 重定向接口请求 */
    // HTML5 History API, the index.html page will likely have to be served in place of any 404 responses
    historyApiFallback: {
      // 指定文件类型, 匹配了才重定向
      // htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
      rewrites: [
        {
          from: /^\/([a-zA-Z0-9]+\/?)([a-zA-Z0-9]+)/,
          to: function (context) {
            return '/' + context.match[1] + context.match[2] + '.html'
          }
        }
      ]
    },
    // Specify a page to navigate to when opening the browser
    // openPage: '',
    // the dev-server will only compile the bundle when it gets requested
    // lazy: true,
    // By default dev-server will be served over HTTP. It can optionally be served over HTTP/2 with HTTPS
    // https: true,
    // send API requests on the same domain
    proxy: {
      '/': {
        // 请求远端服务器
        target: 'https://m.weibo.cn',
        // 找到真实请求的地址, 代理元 dot 到 url
        changeOrigin: true,
        // http 请求头
        headers: {
          Cookie: ''
        },
        // 控制台信息
        logLevel: 'debug',
        // 重定向接口请求
        pathRewrite: {
          '^/comments': '/api/comments'
        }
      }
    }
  },
  module: {
    // 执行顺序是后向前
    rules: [
      {
        test: /\.scss$/,
        // 用在生产环境中
        // use: ExtractTextWebpackPlugin.extract({
        // 	fallback: {
        // 		loader: 'style-loader',
        // 		options: {
        // 			singleton: true,
        // 			transform: './css.transform.js'
        // 		}
        // 	},
        // 	use: [
        // 		{
        // 			loader: 'sass-loader'
        // 		}
        // 	]
        // })
        /* 处理过程, 从后往前 */
        use: [
          {
            /* 在最后生成的 js 文件中进行处理，动态创建 style 标签，塞到 head 标签里 */
            loader: 'style-loader',
            /* Adds CSS to the DOM by injecting a <link/> tag */
            // loader: 'style-loader/url',
            /* 控制样式是否插入页面中, 多了 .use() & .unuse() 方法 */
            // loader: 'style-loader/useable',
            options: {
              // singleton 会阻止 sourceMap
              sourceMap: true,
              /* singleton(是否只使用一个 style 标签) */
              // singleton: true,
              /* 插入页面前, 根据不同浏览器配置不同样式 */
              transform: './css.transform.js'
            }
          },
          {
            // 让 js 能 @import css 文件进来
            loader: 'css-loader',
            options: {
              sourceMap: true,
              /* 在 css-loader 前应用的 loader 的数量 */
              importLoaders: 2,
              /* 是否压缩 */
              minimize: true,
              /* 启用 css-modules */
              modules: true,
              /* 定义 css-modules 编译出来文件的名称 */
              localIdentName: '[path][name]_[local]_[hash:base64:5]'
            }
          },
          {
            /* 将css3属性添加上厂商前缀 */
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              // 下面的插件给 postcss 使用
              ident: 'postcss',
              plugins: [
                /* 加 css 各浏览器前缀 */
                require('autoprefixer')(),
                /* 优化 & 压缩 css */
                require('cssnano')(),
                /* 使用未来的 css 语法 */
                require('postcss-cssnext')(),
                /* 图片合并成一张图 */
                require('postcss-sprites')({
                  /* 输出路径 */
                  spritePath: 'dist/assets/imgs/sprites',
                  /* 处理苹果 retina 屏幕 */
                  retina: true
                })
              ]
            }
          },
          {
            /* 放置 css-loader 下面 */
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        exclude: path.resolve(__dirname, 'src/libs'),
        use: [
          {
            loader: 'babel-loader',
            options: {
              // 自动转换 es5+ 为 es5
              presets: ['@babel/preset-env'],
              // UglifyJsWebpackPlugin 对 lodash 无用, 使用 babel-plugin-lodash 能去除 lodash 多余 js
              // transform-runtime: 能写 es7/8 新方法, 开发组件类库中使
              // babel-polyfill: 能写 es7/8 新方法, 开发应用使用, main.js 中引用 `import babel-polyfill`
              plugins: ['lodash', '@babel/transform-runtime']
            }
          },
          {
            // 放置 babel-loader 之后
            loader: 'eslint-loader',
            options: {
              formatter: require('eslint-friendly-formatter')
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        use: [
          // 开发环境使用
          // {
          //   loader: 'file-loader',
          //   options: {
          //     name: '[name]-[hash:5].[ext]',
          //     publicPath: '',
          //     outputPath: 'dist/',
          //     useRelativePath: true
          //   }
          // },
          // 生成环境使用
          {
            // 处理成 base64
            loader: 'url-loader',
            options: {
              // 生成的图片名称
              name: '[name]-[hash:5].[ext]',
              /* 超出 1000 处理成 base64 */
              limit: 1000,
              /* 打头的路径目录为 '' */
              publicPath: '',
              /* 放置在 dist */
              outputPath: 'dist/',
              /* 放置在 assets/imgs, 因为图片原本路径为 (aseets/imgs) */
              useRelativePath: true
            }
          },
          {
            /* 压缩图片 */
            loader: 'img-loader',
            options: {
              /* .png 图片处理 */
              pngquant: {
                /* 压缩 png */
                quality: 80
              }
            }
          }
        ]
      },
      {
        /* 字体文件 */
        test: /\.(eot|woff2?|ttf|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[name]-[hash:5].[ext]',
              /* 超出 5000 处理成 base64 */
              limit: 5000,
              outputPath: 'assets/imgs/'
            }
          }
        ]
      },
      // {
      // 	test: path.resolve(__dirname, 'src/app.js'),
      // 	use: [
      // 		{
      // 			loader: 'imports-loader',
      // 			options: {
      // 				$: 'jquery'
      // 			}
      // 		}
      // 	]
      // },
      {
        test: /\.html$/,
        use: [
          {
            /* HTML 哪部分交由 webpack 处理 */
            loader: 'html-loader',
            options: {
              attrs: ['img:src', 'img:data-src']
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new BundleAnalyzerPlugin(),
    /* 提取 css */
    extractLess,
    // new ExtractTextWebpackPlugin({
    //   // 提取出来的 css 名称, 手动用 link 标签引入
    //   filename: '[name].min.css',
    //   /* 指定提取 css 范围, 提取初始化的 css, 异步引入的 css 代码不包括 */
    //   // import ('./css/components/a.scss').then(function () {
    //   allChunks: false
    // }),
    /* 放置 ExtractTextWebpackPlugin 之后 */
    /* 去除多余的 css */
    new PurifyCssWebpack({
      /* 针对指定路径文件来处理 */
      paths: globAll.sync([
        path.join(__dirname, './*.html'),
        path.join(__dirname, './src/*.js')
      ])
    }),
    /* 去除多余的 js */
    new UglifyJsWebpackPlugin(),
    /* 第三方模块 js 注入 (use npm install) */
    new webpack.ProvidePlugin({
      $: 'jquery'
    }),
    // 生成 html, 即使 css, js 文件名称变化时, 能自动加载配对的 css, js 文件
    new HtmlWebpackPlugin({
      /* 输出文件的名字 */
      filename: 'index.html',
      /* 本地模版的位置 */
      template: './index.html',
      /* 向 template 或者 templateContent 中注入所有静态资源 */
      // inject: false,
      /* 插入到 html 的 entry chunk */
      chunks: ['app'],
      /* 压缩 */
      minify: {
        collapseWhitespace: true
      }
    }),
    /* chunk 加到 html */
    new HtmlWebpackInlineChunkPlugin({
      inlineChunks: ['manifest']
    }),
    // 打包后清除目录
    new CleanWebpackPlugin(['dist']),
    // 热更新
    new webpack.HotModuleReplacementPlugin(),
    // 热更新时路径输出
    new webpack.NamedModulesPlugin()
    /* webpack4 替代 webpack.optimize.CommonsChunkPlugin, 提取公共代码 */
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'common',
    //   minChunks: 2
    // })
  ]
}
