/*
 * Copyright (c) 2020-2021 Rostislav Hristov
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

import { existsSync } from "fs";
import { basename, join, resolve } from "path";

import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import { Issue } from "fork-ts-checker-webpack-plugin/lib/issue";
import { sync } from "glob";
import HtmlWebpackPlugin from "html-webpack-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import { register } from "ts-node";
import {
    Compiler,
    Configuration,
    EnvironmentPlugin,
    IgnorePlugin,
    NormalModuleReplacementPlugin,
    WebpackPluginInstance,
} from "webpack";
import analyzer from "webpack-bundle-analyzer";
import { merge } from "webpack-merge";
import { InjectManifest } from "workbox-webpack-plugin";

import { interpolateName, readFile } from "./util";

register();

class ForkTsCheckerESLintWarningWebpackPlugin implements WebpackPluginInstance {
    apply(compiler: Compiler) {
        ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler).issues.tap("ErrorsAsWarnings", (issues: Issue[]) =>
            issues.map((issue) => {
                if (issue.origin === "eslint") {
                    return {
                        ...issue,
                        severity: "warning",
                    };
                }
                return issue;
            })
        );
    }
}

export default function (applicationPath: string, extensionPath?: string) {
    const definition = "package.json";
    const extensionName = (extensionPath && readFile(resolve(extensionPath, definition)).name) ?? "";
    const webpackConfig = require(resolve(applicationPath, "webpack.config")).default;

    const intlMap = sync("intl/*.json", {
        cwd: applicationPath,
    }).reduce<Record<string, string>>(
        (acc, val) => ({
            ...acc,
            [basename(val, ".json")]: val,
        }),
        {}
    );

    const commonConfig: Configuration = {
        context: applicationPath,
        devServer: {
            clientLogLevel: "silent",
            historyApiFallback: true,
            host: "0.0.0.0",
            port: 3000,
            publicPath: "/",
            quiet: true,
        },
        entry: sync("index.{ts,tsx}", {
            cwd: resolve(applicationPath, "src"),
        })[0],
        optimization: {
            splitChunks: {
                cacheGroups: {
                    default: false,
                    defaultVendors: false,
                },
            },
        },
        output: {
            globalObject: "self",
            path: resolve(applicationPath, "dist"),
            publicPath: "/",
        },
        plugins: [
            new CleanWebpackPlugin(),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: "public",
                        from: "**/*.{png,svg,txt,webmanifest,xml}",
                        globOptions: {
                            dot: false,
                        },
                    },
                ],
            }),
            new EnvironmentPlugin({
                EXTENSION_NAME: extensionName,
                NODE_ENV: process.env.NODE_ENV,
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
            alias: {
                ...(extensionName && extensionPath ? { [extensionName]: resolve(extensionPath, "src") } : {}),
            },
            extensions: [".js", ".json", ".ts", ".tsx"],
            modules: ["node_modules", "src"],
        },
    };

    const developmentConfig: Configuration = {
        devServer: {
            disableHostCheck: true,
            headers: { "Access-Control-Allow-Origin": "*" },
            hot: true,
        },
        devtool: "eval-cheap-module-source-map",
        mode: "development",
        module: {
            rules: [
                {
                    exclude: /node_modules/,
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: { plugins: ["react-refresh/babel"] },
                        },
                        {
                            loader: "ts-loader",
                            options: {
                                compilerOptions: {
                                    jsx: "react-jsxdev",
                                    module: "es2020",
                                    sourceMap: true,
                                },
                                transpileOnly: true,
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
                    ...Object.values(intlMap).map((intl) => ({
                        from: resolve(applicationPath, intl),
                        to: join("application", "messages", basename(intl)),
                    })),
                ],
            }),
            new EnvironmentPlugin({
                INTL_MAP: Object.entries(
                    Object.keys(intlMap).reduce(
                        (acc, val) => ({ ...acc, [val]: join("/", "application", "messages", basename(intlMap[val])) }),
                        {}
                    )
                ),
            }),
            new ForkTsCheckerWebpackPlugin({
                eslint: {
                    files: join(extensionPath ?? applicationPath, "src/**/*.{ts,tsx}"),
                },
                typescript: {
                    configFile: join(extensionPath ?? applicationPath, "tsconfig.json"),
                },
            }),
            new ForkTsCheckerESLintWarningWebpackPlugin(),
            new HtmlWebpackPlugin({
                favicon: resolve(applicationPath, "public", "favicon.ico"),
                filename: "index.html",
                inject: true,
                template: resolve(applicationPath, "public", "index.html"),
            }),
            new NormalModuleReplacementPlugin(/.*/, (resource) => {
                const nodeModules = "node_modules";
                if (resource.createData.resource?.includes(nodeModules)) {
                    const localResourcePath = join(
                        applicationPath,
                        nodeModules,
                        resource.createData.resource?.split(nodeModules).slice(1).join(nodeModules)
                    );
                    if (existsSync(localResourcePath)) {
                        resource.createData.resource = localResourcePath;
                    }
                }
            }),
            new ReactRefreshWebpackPlugin(),
        ],
    };

    const productionConfig: Configuration = {
        bail: true,
        devServer: {
            compress: true,
            hot: false,
            injectClient: false,
            injectHot: false,
            liveReload: false,
            port: 4000,
        },
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
        },
        output: {
            chunkFilename: "application/scripts/[name].[contenthash:8].js",
            filename: "application/scripts/[name].[contenthash:8].js",
        },
        plugins: [
            new analyzer.BundleAnalyzerPlugin({
                analyzerMode: "static",
                logLevel: "silent",
                openAnalyzer: false,
                reportFilename: resolve("analysis/index.html"),
            }),
            new CopyWebpackPlugin({
                patterns: [
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
            new ForkTsCheckerWebpackPlugin({
                eslint: {
                    files: "src/**/*.{ts,tsx}",
                },
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

    switch (process.env.NODE_ENV) {
        case "development":
            return merge(commonConfig, developmentConfig, webpackConfig);
        case "production":
            return merge(commonConfig, productionConfig, webpackConfig);
        default:
            return merge(commonConfig, webpackConfig);
    }
}
