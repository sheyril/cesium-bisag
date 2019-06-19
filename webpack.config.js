const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopywebpackPlugin = require('copy-webpack-plugin');
// const nodeExternals = require('webpack-node-externals')

const cesiumSource = 'node_modules/cesium/Source';
const cesiumWorkers = '../Build/Cesium/Workers';

module.exports = {

    context: __dirname,
    entry: {
        app: './src/index.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        sourcePrefix: '',
        publicPath: '/'
    },
    amd: {
        // Enable webpack-friendly use of require in Cesium
        toUrlUndefined: true
    },
    mode: 'development',
    target: 'web',
    resolve: {
        alias: {
            // CesiumJS module name
            cesium: path.resolve(__dirname, cesiumSource)
        }
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: [ 'style-loader', 'css-loader']
        },
        {
            test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
            use: [ 'url-loader' ]
        }]
    },
    devtool: 'inline-source-map',
    plugins: [
       new HtmlWebpackPlugin({
           template: 'src/index.html',
           // excludeChunks: ['server.js']
       }),
       // Copy Cesium Assets, Widgets, and Workers to a static directory
       new CopywebpackPlugin([ { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' } ]),
       new CopywebpackPlugin([ { from: path.join(cesiumSource, 'Assets'), to: 'Assets' } ]),
       new CopywebpackPlugin([ { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' } ]),
       new webpack.DefinePlugin({
           // Define relative base path in cesium for loading assets
           CESIUM_BASE_URL: JSON.stringify('')
       }),
    ],
    devServer: {
        contentBase: path.join(__dirname, "dist"),
        port: 3000,
    },
    // target: 'node',
    node: {
        // Resolve node module use of fs
        fs: 'empty',
        __dirname: false,
        __filename: false
    }
};
