/*
 * Copyright (c) 2020-2022 Rostislav Hristov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import "webpack-dev-server";

import { existsSync } from "fs";
import { basename, join, resolve } from "path";

import CopyWebpackPlugin from "copy-webpack-plugin";
import detectPort from "detect-port";
import EsLintWebpackPlugin from "eslint-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import { sync } from "glob";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { Configuration, EnvironmentPlugin } from "webpack";

import { getIntlMap, getCacheVersion, getExtensionName } from "utils";

const DEFAULT_PORT = 3000;

interface ModeParams {
    applicationPath: string;
    extensionPath?: string;
}

export function getConfigurations({ applicationPath, extensionPath }: ModeParams) {
    const intlMap = getIntlMap(applicationPath);
    const extensionName = extensionPath ? getExtensionName(extensionPath) : "";

    return detectPort(DEFAULT_PORT).then((port) => {
        const developmentConfiguration: Configuration = {
            cache: {
                buildDependencies: {
                    config: [
                        resolve(join(applicationPath, "webpack.config.ts")),
                        ...(extensionPath ? [resolve(join(extensionPath, "webpack.config.ts"))] : []),
                    ].filter(existsSync),
                    defaultWebpack: [resolve(extensionPath ?? applicationPath, "node_modules/webpack/lib/")],
                    tsconfig: [resolve(extensionPath ?? applicationPath, "tsconfig.json")],
                },
                cacheDirectory: resolve(extensionPath ?? applicationPath, "node_modules/.cache"),
                store: "pack",
                type: "filesystem",
                version: getCacheVersion(),
            },
            devServer: {
                allowedHosts: "all",
                headers: {
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Origin": "*",
                },
                hot: true,
                port,
            },
            devtool: "cheap-module-source-map",
            entry: sync("index.{ts,tsx}", {
                cwd: resolve(applicationPath, "src"),
            })[0],
            mode: "development",
            module: {
                rules: [
                    {
                        exclude: /node_modules/,
                        test: /\.tsx?$/,
                        use: [
                            {
                                loader: "swc-loader",
                                options: {
                                    inlineSourcesContent: true,
                                    jsc: {
                                        parser: {
                                            syntax: "typescript",
                                            tsx: true,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            output: {
                chunkFilename: "application/scripts/[name].js",
                filename: "application/scripts/[name].js",
            },
            plugins: [
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            context: "public",
                            from: "**/*.{ico,png,svg,txt,webmanifest,xml}",
                            globOptions: {
                                dot: false,
                            },
                        },
                        ...Object.values(intlMap).map((intl) => ({
                            from: resolve(applicationPath, intl),
                            to: join("application", "messages", basename(intl)),
                        })),
                    ],
                }),
                new EnvironmentPlugin({
                    EXTENSION_NAME: extensionName ?? "",
                    INTL_MAP: Object.entries(
                        Object.keys(intlMap).reduce(
                            (acc, val) => ({
                                ...acc,
                                [val]: join("/", "application", "messages", basename(intlMap[val])),
                            }),
                            {}
                        )
                    ),
                }),
                new EsLintWebpackPlugin({
                    files: join(extensionPath ?? applicationPath, "src/**/*.{ts,tsx}"),
                }),
                new ForkTsCheckerWebpackPlugin({
                    typescript: {
                        configFile: join(extensionPath ?? applicationPath, "tsconfig.json"),
                        configOverwrite: {
                            compilerOptions: {
                                noUnusedLocals: false,
                                noUnusedParameters: false,
                            },
                        },
                    },
                }),
                new HtmlWebpackPlugin({
                    filename: "index.html",
                    inject: true,
                    template: resolve(applicationPath, "public", "index.html"),
                }),
            ],
            resolve: {
                alias: {
                    ...(extensionName && extensionPath
                        ? {
                              "webpack/hot": resolve(applicationPath, "node_modules", "webpack/hot"),
                              "webpack-dev-server/client": resolve(
                                  applicationPath,
                                  "node_modules",
                                  "webpack-dev-server/client"
                              ),
                          }
                        : {}),
                    ...(extensionName && extensionPath ? { [extensionName]: resolve(extensionPath, "src") } : {}),
                },
                modules: [
                    ...(extensionPath ? [resolve(extensionPath, "src")] : []),
                    ...(extensionPath ? [resolve(extensionPath, "node_modules")] : []),
                    resolve(applicationPath, "src"),
                    resolve(applicationPath, "node_modules"),
                    "node_modules",
                ],
            },
            stats: "errors-warnings",
        };

        return [developmentConfiguration];
    });
}
