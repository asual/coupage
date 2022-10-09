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

declare global {
    interface Window {
        define: ((name: string, dependencies: string[], factory: (...args: unknown[]) => ExtensionModule) => void) & {
            amd: boolean;
            callbacks: Record<string, (script: ExtensionModule) => void>;
            dependencies: Record<string, Record<string, unknown>>;
        };
    }
}

const cache = {
    definitions: {} as Record<string, ExtensionModule>,
    messages: {} as Record<string, Record<string, Record<string, string>>>,
    points: {} as Record<string, Record<string, ExtensionModule>>,
};

const loadMessages = (locale: string, messages?: Record<string, string>) =>
    messages && messages[locale]
        ? fetch(messages[locale]).then<Record<string, string>>((data) => data.json())
        : Promise.resolve({});

const loadScript = (
    extensionName: string,
    extensionScriptName: string,
    extensionResources: ExtensionResources,
    dependencies: Record<string, unknown>,
    nonce?: string
) => {
    if (!window.define) {
        window.define = Object.assign(
            (moduleName: string, dependencyNames: string[], factory: (...args: unknown[]) => ExtensionModule) => {
                window.define.callbacks[moduleName](
                    factory(
                        ...dependencyNames.map(
                            (dependencyName) => window.define.dependencies[moduleName][dependencyName]
                        )
                    )
                );
            },
            {
                amd: true,
                callbacks: {},
                dependencies: {},
            }
        );
    }
    return new Promise<ExtensionModule>((resolve) => {
        const name = `${extensionName}.${extensionScriptName}`;
        window.define.callbacks[name] = resolve;
        window.define.dependencies[name] = dependencies;
        const script = document.createElement("script");
        script.addEventListener("load", () => {
            document.head.removeChild(script);
        });
        if (nonce) {
            script.setAttribute("nonce", nonce);
        }
        script.setAttribute("src", extensionResources.scripts[extensionScriptName]);
        script.setAttribute("type", "text/javascript");
        document.head.appendChild(script);
    });
};

export interface ExtensionModule<T = unknown> {
    default: T;
}

export interface ExtensionResources {
    messages?: Record<string, string>;
    scripts: Record<string, string>;
    styles?: Record<string, string>;
}

export function getExtensionMessages(extensionName: string, locale: string): Record<string, string> | void {
    if (Object.keys(cache.messages).length !== 0) {
        return cache.messages[extensionName] && cache.messages[extensionName][locale];
    }
}

export function getExtensionDefinition<T = unknown>(extensionName: string): ExtensionModule<T> | void {
    if (Object.keys(cache.definitions).length !== 0) {
        return cache.definitions[extensionName] as ExtensionModule<T>;
    }
}

export function loadExtensionPoint<T = unknown>(
    extensionName: string,
    extensionPointName: string,
    extensionResources: ExtensionResources,
    dependencies: Record<string, unknown>,
    nonce?: string
): Promise<ExtensionModule<T>> {
    if (process.env.EXTENSION_NAME) {
        extensionName = extensionName || process.env.EXTENSION_NAME;
    }
    if (cache.points[extensionName] && cache.points[extensionName][extensionPointName]) {
        return Promise.resolve(cache.points[extensionName][extensionPointName] as ExtensionModule<T>);
    }
    return (
        process.env.NODE_ENV === "development" &&
        process.env.EXTENSION_NAME &&
        process.env.EXTENSION_NAME === extensionName
            ? import(`${process.env.EXTENSION_NAME}/index`)
            : loadScript(extensionName, "main", extensionResources, dependencies, nonce)
    ).then((script) => {
        const extensionPoint = {
            default: script.default[extensionPointName],
        };
        cache.points[extensionName] = {
            ...cache.points[extensionName],
            [extensionPointName]: extensionPoint,
        };
        return extensionPoint;
    });
}

export function loadResources(
    resources: Record<string, ExtensionResources>,
    dependencies: Record<string, unknown>,
    locale: string,
    nonce?: string
): Promise<void> {
    return Promise.all(
        Object.keys(resources).map((extensionName) => {
            if (getExtensionDefinition(extensionName)) {
                return Promise.resolve();
            }
            const extensionResources = resources[extensionName];
            return Promise.all([
                process.env.NODE_ENV === "development" &&
                process.env.EXTENSION_NAME &&
                process.env.EXTENSION_NAME === extensionName
                    ? import(`${process.env.EXTENSION_NAME}/definition`)
                    : loadScript(extensionName, "definition", extensionResources, dependencies, nonce),
                loadMessages(locale, extensionResources.messages),
            ]).then(([definition, messages]) => {
                cache.definitions[extensionName] = definition;
                cache.messages[extensionName] = {
                    ...cache.messages[extensionName],
                    [locale]: messages,
                };
            });
        })
    ).then(() => {
        void 0;
    });
}

export function preloadResources(resources: Record<string, ExtensionResources>, locale: string, nonce?: string): void {
    Object.keys(resources)
        .filter(
            (extensionName) =>
                !(
                    process.env.NODE_ENV === "development" &&
                    process.env.EXTENSION_NAME &&
                    process.env.EXTENSION_NAME === extensionName
                )
        )
        .forEach((extensionName) => {
            const extensionResources = resources[extensionName];
            const definition = document.createElement("link");
            definition.setAttribute("as", "script");
            definition.setAttribute("href", extensionResources.scripts.definition);
            if (nonce) {
                definition.setAttribute("nonce", nonce);
            }
            definition.setAttribute("rel", "preload");
            document.head.appendChild(definition);
            if (extensionResources.messages) {
                const messages = document.createElement("link");
                messages.setAttribute("as", "fetch");
                messages.setAttribute("crossorigin", "anonymous");
                messages.setAttribute("href", extensionResources.messages[locale]);
                if (nonce) {
                    messages.setAttribute("nonce", nonce);
                }
                messages.setAttribute("rel", "preload");
                document.head.appendChild(messages);
            }
        });
}

export function createExtensionDefinition<T>(definitionTemplate: T, definition: T): T {
    return {
        ...definitionTemplate,
        ...definition,
    };
}

export function createExtensionPointDefinition<T>(): T {
    return {} as T;
}

export function extractExtensionPointNames<T extends object>(definitionTemplate: T): Record<keyof T, string> {
    return Object.keys(definitionTemplate).reduce(
        (acc, val) => ({
            ...acc,
            [val]: val,
        }),
        {} as Record<keyof T, string>
    );
}
