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

import { Stats, webpack } from "webpack";

import { merge } from "utils";

const applicationPath = process.env.COUPAGE_APPLICATION_PATH ?? "";
const extensionPath = process.env.COUPAGE_EXTENSION_PATH ?? "";

Promise.all([
    import("configurations/common").then(({ getConfigurations }) =>
        getConfigurations(applicationPath || extensionPath)
    ),
    import("configurations/production").then(({ getConfigurations }) => {
        if (applicationPath) {
            return getConfigurations({ applicationPath });
        } else {
            return getConfigurations({ extensionPath });
        }
    }),
    import("configurations/custom").then(({ getConfigurations }) =>
        getConfigurations(applicationPath || extensionPath)
    ),
]).then((configurations) => {
    const configuration = merge(configurations.flat());
    webpack(configuration, (error?: Error, stats?: Stats) => {
        if (error) {
            // eslint-disable-next-line no-console
            console.error(error.message);
            process.exit(1);
        }
        if (stats) {
            if (stats.hasErrors()) {
                const errors = stats.toJson().errors;
                errors?.forEach(({ message }) => {
                    // eslint-disable-next-line no-console
                    console.error(message);
                });
                process.exit(1);
            }
        }
    });
});
