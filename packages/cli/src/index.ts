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

/* eslint-disable no-console */

import startDevServer from "@webpack-cli/serve/lib/startDevServer";
import commandLineArgs from "command-line-args";
import webpack, { Stats } from "webpack";

import application from "./application";
import extension from "./extension";
import intl from "./intl";
import { readFile } from "./util";

const commandOptions = commandLineArgs(
    [
        {
            defaultOption: true,
            name: "name",
        },
    ],
    {
        stopAtFirstUnknown: true,
    }
);

switch (commandOptions.name) {
    case "build":
        webpack(
            !readFile("package.json").peerDependencies ? application() : extension(),
            (error?: Error, stats?: Stats) => {
                if (error) {
                    console.error(error.message);
                    process.exit(1);
                }
                if (stats) {
                    if (stats.hasErrors()) {
                        const errors = stats.toJson().errors as Error[];
                        errors.forEach(({ message }) => {
                            console.error(message);
                        });
                        process.exit(1);
                    }
                }
            }
        );
        break;
    case "intl":
        intl();
        break;
    case "start":
        startDevServer(webpack(application()), [], [], console);
        break;
}
