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

import { resolve } from "path";

import commandLineArgs from "command-line-args";
import { sync } from "cross-spawn";

import { readJsonFile } from "utils";

const command = commandLineArgs(
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

const isExtension = !!readJsonFile("package.json").peerDependencies;

switch (command.name) {
    case "build": {
        process.env.COUPAGE_APPLICATION_PATH = isExtension ? "" : resolve();
        process.env.COUPAGE_EXTENSION_PATH = isExtension ? resolve() : "";
        process.env.NODE_ENV = "production";

        import("scripts/build");
        break;
    }
    case "serve": {
        const args = commandLineArgs(
            [
                {
                    alias: "a",
                    name: "application",
                    type: String,
                },
                {
                    alias: "p",
                    name: "production",
                    type: Boolean,
                },
            ],
            { argv: command._unknown || [] }
        );

        process.env.COUPAGE_APPLICATION_PATH = isExtension && args.application ? resolve(args.application) : resolve();
        process.env.COUPAGE_EXTENSION_PATH = isExtension ? resolve() : "";
        process.env.NODE_ENV = args.production ? "production" : "development";

        const serve = require.resolve("@coupage/cli/scripts/serve", {
            paths: [process.env.COUPAGE_APPLICATION_PATH],
        });
        const result = sync(process.execPath, [serve], { stdio: "inherit" });
        if (result.signal) {
            process.exit(1);
        }
        process.exit(result.status ?? 0);
    }
}
