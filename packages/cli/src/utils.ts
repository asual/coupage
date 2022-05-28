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

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { basename, resolve } from "path";

import { sync } from "glob";
import { Configuration } from "webpack";
import { mergeWithRules } from "webpack-merge";

export function interpolateName(path: string) {
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex").substring(0, 8);
    return basename(path).replace(".", "." + hash + ".");
}

export function readJsonFile(path: string) {
    return JSON.parse(readFileSync(path, "utf-8"));
}

export function getExtensionName(path: string) {
    return readJsonFile(resolve(path, "package.json")).name;
}

export function getIntlMap(path: string) {
    return sync("intl/*.json", {
        cwd: path,
    }).reduce<Record<string, string>>(
        (acc, val) => ({
            ...acc,
            [basename(val, ".json")]: val,
        }),
        {}
    );
}

export function merge(configurations: Configuration[]): Configuration {
    return mergeWithRules({
        module: {
            rules: {
                test: "match",
                use: {
                    loader: "match",
                    options: "replace",
                },
            },
        },
    })(configurations);
}

export function getCacheVersion() {
    return createHash("sha256").update(JSON.stringify(process.env)).digest("hex");
}
