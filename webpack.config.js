const path = require('path');
const fs = require('fs');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const soundList = fs.readdirSync(
  path.join(__dirname, 'assets/soundfont/')
).filter(dirent => dirent.isDirectory());

module.exports = (env, argv) => {
  return {
    entry: './src/index.js',
    output: {
      filename: 'main.js',
      path: path.join(__dirname, 'dist')
    },
    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      compress: true,
      port: 9000
    },
    optimization: {
      minimizer: [new UglifyJsPlugin({
        sourceMap: argv.mode == 'development' ? true : false,
      })],
    },
    plugins: [
      new webpack.DefinePlugin({
        SOUND_LIST: JSON.stringify(soundList)
      }),
      new HtmlWebpackPlugin({
        title: "Jakab's Tiny Sequencer",
        'meta': {
          'viewport': 'width=device-width, initial-scale=1, shrink-to-fit=no',
          'theme-color': '#421383'
        }
      }),
      new CopyPlugin([
        { from: 'assets/soundfont/**' },
      ]),
    ],

    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },

        {
          test: /\.m?js$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-proposal-class-properties']
            }
          }
        }
      ],
    }
  }
};