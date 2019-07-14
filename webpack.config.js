const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Jakab's Tiny Sequencer",
      'meta': {
        'viewport': 'width=device-width, initial-scale=1, shrink-to-fit=no',
        'theme-color': '#421383'
      }
    }),
    new CopyPlugin([
      {from: 'assets/soundfont/acoustic_grand_piano-mp3/**'},
      // {from: 'assets/soundfont/acoustic_grand_piano-mp3.js', to: 'assets/soundfont/acoustic_grand_piano-mp3.js'},
      // {from: 'assets/soundfont/acoustic_grand_piano-ogg.js', to: 'assets/soundfont/acoustic_grand_piano-ogg.js'}
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
};