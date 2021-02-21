/*
 * Copyright (c) 2020 Rostislav Hristov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { readFileSync } from "fs";
import { basename, join, resolve } from "path";

import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import { sync } from "glob";
import TerserWebpackPlugin from "terser-webpack-plugin";
import { Configuration, EnvironmentPlugin, IgnorePlugin } from "webpack";
import analyzer from "webpack-bundle-analyzer";

import { interpolateName } from "./util";

export default () => {
    const intlMap: Record<string, string> = sync("intl/*.json").reduce(
        (acc, val) => ({
            ...acc,
            [basename(val, ".json")]: val,
        }),
        {}
    );
    const packageDefinition = JSON.parse(readFileSync("package.json").toString());
    const packageDependencies = packageDefinition.peerDependencies || {};
    const packageName = packageDefinition.name;

    const productionConfig: Configuration = {
        bail: true,
        entry: {
            definition: resolve(...sync("src/definition.{ts,tsx}")),
            main: resolve(...sync("src/index.{ts,tsx}")),
        },
        externals: Object.keys(packageDependencies).reduce(
            (acc, val) => ({
                ...acc,
                [val]: {
                    amd: val,
                },
            }),
            {}
        ),
        mode: "production",
        module: {
            rules: [
                {
                    exclude: /node_modules/,
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: "ts-loader",
                            options: {
                                compilerOptions: {
                                    module: "es2020",
                                },
                                transpileOnly: true,
                            },
                        },
                    ],
                },
            ],
        },
        optimization: {
            minimizer: [
                new TerserWebpackPlugin({
                    extractComments: false,
                }),
            ],
            splitChunks: {
                cacheGroups: {
                    default: false,
                    defaultVendors: false,
                },
            },
        },
        output: {
            chunkFilename: "scripts/[name].[contenthash:8].js",
            filename: "scripts/[name].[contenthash:8].js",
            globalObject: "self",
            library: `${packageName}.[name]`,
            libraryTarget: "amd",
            path: resolve("dist"),
        },
        plugins: [
            new analyzer.BundleAnalyzerPlugin({
                analyzerMode: "static",
                logLevel: "silent",
                openAnalyzer: false,
                reportFilename: resolve("analysis/index.html"),
            }),
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin({
                patterns: [
                    ...Object.values(intlMap).map((intl) => ({
                        from: intl,
                        to: join("messages", interpolateName(intl)),
                    })),
                ],
            }),
            new EnvironmentPlugin({
                NODE_ENV: process.env.NODE_ENV,
            }),
            new ForkTsCheckerWebpackPlugin({
                eslint: {
                    files: "src/**/*.{ts,tsx}",
                },
            }),
            new IgnorePlugin({
                checkResource: (resource: string, context: string) => {
                    const contextRegExp = new RegExp(
                        "@formatjs[\\/]intl-(pluralrules|relativetimeformat)[\\/]locale-data$"
                    );
                    const resourceRegExp = new RegExp(
                        `/(${Object.keys(intlMap)
                            .map((locale) => locale.split("-")[0])
                            .join("|")})$`
                    );
                    return contextRegExp.test(context) && !resourceRegExp.test(resource);
                },
            }),
        ],
        resolve: {
            extensions: [".js", ".json", ".ts", ".tsx"],
            modules: ["node_modules", "src"],
        },
    };
    return productionConfig;
};
