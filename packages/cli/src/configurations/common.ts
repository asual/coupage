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

import { resolve } from "path";

import { Configuration, EnvironmentPlugin } from "webpack";

export function getConfigurations(path: string) {
    const commonConfiguration: Configuration = {
        context: path,
        devServer: {
            allowedHosts: "all",
            client: {
                logging: "none",
                overlay: {
                    errors: true,
                    warnings: false,
                },
            },
            devMiddleware: {
                publicPath: "/",
            },
            historyApiFallback: true,
        },
        infrastructureLogging: {
            appendOnly: true,
            console: {
                ...console,
                info: (...args) => {
                    // eslint-disable-next-line no-console
                    console.info(args[0]?.replace(/^\[[^\]]+\]+ /, ""), ...args.slice(1));
                },
            },
            level: "info",
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    default: false,
                    defaultVendors: false,
                },
            },
        },
        output: {
            clean: true,
            globalObject: "self",
            path: resolve(path, "dist"),
            publicPath: "/",
        },
        plugins: [
            new EnvironmentPlugin({
                NODE_ENV: process.env.NODE_ENV,
            }),
        ],
        resolve: {
            extensions: [".cjs", ".js", ".json", ".mjs", ".ts", ".tsx"],
        },
    };
    return Promise.resolve([commonConfiguration]);
}
