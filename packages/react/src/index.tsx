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

import {
    ExtensionModule,
    ExtensionResources,
    getExtensionDefinition,
    getExtensionMessages,
    loadExtensionPoint,
    loadResources,
} from "@coupage/core";
import {
    ComponentType,
    createContext,
    createElement,
    Fragment,
    FunctionComponent,
    lazy,
    ProviderProps,
    ReactElement,
    Suspense,
    useContext,
} from "react";
import { IntlProvider, useIntl } from "react-intl";

interface ExtensionContext {
    dependencies: Record<string, unknown>;
    language?: string;
    nonce?: string;
    resources: Record<string, ExtensionResources>;
}

const extensionContext = createContext<ExtensionContext>({
    dependencies: {},
    resources: {},
});

const extensionPointContext = createContext<string>("");

export interface ExtensionComponentProps {
    fallback?: ReactElement;
    name: string;
}

export function ExtensionComponent({ fallback = <Fragment />, name }: ExtensionComponentProps) {
    const { dependencies, nonce, resources } = useContext(extensionContext);
    const extensionName = useContext(extensionPointContext);
    const extensionPointName = name;
    const extensionResources = resources[extensionName];
    return (
        <Suspense fallback={fallback}>
            {createElement(
                lazy(() =>
                    loadExtensionPoint<ComponentType>(
                        extensionName,
                        extensionPointName,
                        extensionResources,
                        dependencies,
                        nonce
                    )
                )
            )}
        </Suspense>
    );
}

export interface ExtensionPointProps<T> {
    children: (props: T) => ReactElement;
    fallback?: ReactElement;
    filter?: (definition: T) => boolean;
    name: string;
    sort?: (a: T, b: T) => number;
}

export function ExtensionPoint<T>({ children, fallback = <Fragment />, filter, name, sort }: ExtensionPointProps<T>) {
    const { locale } = useIntl();
    const { language, resources } = useContext(extensionContext);
    const definitions = Object.keys(resources).reduce((acc: Record<string, T>, val) => {
        const definition = getExtensionDefinition<Record<string, T>>(val);
        if (!definition || !definition?.default[name]) {
            return acc;
        }
        if (filter && !filter(definition.default[name])) {
            return acc;
        }
        return {
            ...acc,
            [val]: definition.default[name],
        };
    }, {});
    const keys = Object.keys(definitions);
    if (keys.length === 0) {
        return fallback;
    }
    return (
        <Fragment>
            {(sort ? keys.sort((a, b) => sort(definitions[a], definitions[b])) : keys).map((key) => {
                const props = {
                    value: key,
                };
                return (
                    <IntlProvider
                        key={key}
                        locale={locale}
                        messages={getExtensionMessages(key, language ?? locale) || {}}
                    >
                        {createElement(extensionPointContext.Provider, props, children(definitions[key]))}
                    </IntlProvider>
                );
            })}
        </Fragment>
    );
}

export interface ExtensionProviderProps {
    children: ReactElement | ReactElement[];
    dependencies: Record<string, unknown>;
    language?: string;
    nonce?: string;
    resources: Record<string, ExtensionResources>;
}

export function ExtensionProvider({ children, dependencies, language, nonce, resources }: ExtensionProviderProps) {
    const { locale } = useIntl();
    const props = {
        value: {
            dependencies,
            language,
            nonce,
            resources,
        },
    };
    return (
        <Suspense fallback={<Fragment />}>
            {createElement(
                lazy<FunctionComponent<ProviderProps<ExtensionContext>>>(() =>
                    loadResources(resources, dependencies, language ?? locale, nonce).then<
                        ExtensionModule<() => ReactElement<ProviderProps<ExtensionContext>>>
                    >(() => ({
                        default: function Provider() {
                            return createElement(extensionContext.Provider, props, children);
                        },
                    }))
                ),
                props,
                children
            )}
        </Suspense>
    );
}
