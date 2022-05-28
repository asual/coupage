/*
 * Copyright (c) 2020-2022 Rostislav Hristov
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

import "webpack-dev-server";

import { join, resolve } from "path";

import CopyWebpackPlugin from "copy-webpack-plugin";
import detectPort from "detect-port";
import EsLintWebpackPlugin from "eslint-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import { sync } from "glob";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { Configuration, EnvironmentPlugin } from "webpack";
import analyzer from "webpack-bundle-analyzer";
import { merge } from "webpack-merge";
import { InjectManifest } from "workbox-webpack-plugin";

import { getIntlMap, interpolateName, readJsonFile } from "utils";

const DEFAULT_PORT = 8000;

interface ApplicationModeParams {
    applicationPath: string;
    extensionPath?: never;
}

interface ExtensionModeParams {
    applicationPath?: never;
    extensionPath: string;
}

export function getConfiguration({ applicationPath, extensionPath }: ApplicationModeParams | ExtensionModeParams) {
    const path = extensionPath ?? applicationPath;
    const intlMap = getIntlMap(path);

    return detectPort(DEFAULT_PORT).then((port) => {
        const productionConfiguration: Configuration = {
            bail: true,
            devServer: {
                compress: true,
                hot: false,
                liveReload: false,
                port,
            },
            mode: "production",
            module: {
                rules: [
                    {
                        exclude: /node_modules/,
                        test: /\.tsx?$/,
                        use: [
                            {
                                loader: "swc-loader",
                                options: {
                                    jsc: {
                                        parser: {
                                            syntax: "typescript",
                                            tsx: true,
                                        },
                                    },
                                    minify: true,
                                },
                            },
                        ],
                    },
                ],
            },
            plugins: [
                new analyzer.BundleAnalyzerPlugin({
                    analyzerMode: "static",
                    logLevel: "silent",
                    openAnalyzer: false,
                    reportFilename: resolve("analysis/index.html"),
                }),
                new EnvironmentPlugin({
                    EXTENSION_NAME: "",
                }),
                new EsLintWebpackPlugin({
                    failOnWarning: true,
                    files: join(path, "src/**/*.{ts,tsx}"),
                }),
                new ForkTsCheckerWebpackPlugin(),
            ],
            resolve: {
                modules: [resolve(path, "src"), resolve(path, "node_modules"), "node_modules"],
            },
        };

        if (extensionPath) {
            const packageDefinition = readJsonFile("package.json");
            const extensionConfiguration: Configuration = {
                entry: {
                    definition: resolve(...sync("src/definition.{ts,tsx}")),
                    main: resolve(...sync("src/index.{ts,tsx}")),
                },
                externals: Object.keys(packageDefinition.peerDependencies).map(
                    (dependency) => new RegExp(`^${dependency}(/.+)?$`)
                ),
                output: {
                    chunkFilename: "scripts/[name].[contenthash:8].js",
                    clean: true,
                    filename: "scripts/[name].[contenthash:8].js",
                    globalObject: "self",
                    library: `${packageDefinition.name}.[name]`,
                    libraryTarget: "amd",
                    path: resolve("dist"),
                },
                plugins: [
                    new CopyWebpackPlugin({
                        patterns: [
                            ...Object.values(intlMap).map((intl) => ({
                                from: intl,
                                to: join("messages", interpolateName(intl)),
                            })),
                        ],
                    }),
                ],
            };

            return merge(productionConfiguration, extensionConfiguration);
        } else {
            const applicationConfiguration: Configuration = {
                entry: sync("index.{ts,tsx}", {
                    cwd: resolve(path, "src"),
                })[0],
                output: {
                    chunkFilename: "application/scripts/[name].[contenthash:8].js",
                    filename: "application/scripts/[name].[contenthash:8].js",
                },
                plugins: [
                    new CopyWebpackPlugin({
                        patterns: [
                            {
                                context: "public",
                                from: "**/*.{png,svg,txt,webmanifest,xml}",
                                globOptions: {
                                    dot: false,
                                },
                            },
                            ...Object.values(intlMap).map((intl) => ({
                                from: intl,
                                to: join("application", "messages", interpolateName(intl)),
                            })),
                        ],
                    }),
                    new EnvironmentPlugin({
                        INTL_MAP: Object.entries(
                            Object.keys(intlMap).reduce(
                                (acc, val) => ({
                                    ...acc,
                                    [val]: join("/", "application", "messages", interpolateName(intlMap[val])),
                                }),
                                {}
                            )
                        ),
                    }),
                    new HtmlWebpackPlugin({
                        favicon: "public/favicon.ico",
                        filename: "index.html",
                        inject: true,
                        minify: true,
                        template: "public/index.html",
                    }),
                    new InjectManifest({
                        swSrc: resolve("src/sw.ts"),
                    }),
                ],
            };

            return merge(productionConfiguration, applicationConfiguration);
        }
    });
}
