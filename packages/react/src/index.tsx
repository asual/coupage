/*
 * Copyright (c) 2020 Rostislav Hristov
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
    getExtensionDefinition,
    getExtensionMessages,
    loadExtensionPoint,
    loadResources,
    Resources,
} from "@coupage/core";
import {
    ComponentType,
    createContext,
    createElement,
    Fragment,
    lazy,
    ReactElement,
    ReactNode,
    Suspense,
    useContext,
} from "react";
import { IntlProvider, useIntl } from "react-intl";

interface ExtensionContext {
    dependencies: Record<string, unknown>;
    nonce?: string;
    resources: Resources;
}

const extensionContext = createContext<ExtensionContext>({
    dependencies: {},
    resources: {},
});

interface ExtensionProviderProps extends ExtensionContext {
    children: ReactNode | ReactNode[];
}

export function ExtensionProvider({ children, dependencies, nonce, resources }: ExtensionProviderProps) {
    const { locale } = useIntl();
    return (
        <Suspense fallback={<Fragment />}>
            {createElement(
                lazy(() =>
                    loadResources(resources, dependencies, locale, nonce).then<
                        ExtensionModule<() => ReactElement<React.ProviderProps<ExtensionContext>>>
                    >(() => ({
                        default: function Provider() {
                            return createElement(
                                extensionContext.Provider,
                                {
                                    value: {
                                        dependencies,
                                        nonce,
                                        resources,
                                    },
                                },
                                children
                            );
                        },
                    }))
                ),
                {
                    children,
                    value: {
                        dependencies,
                        nonce,
                        resources,
                    },
                }
            )}
        </Suspense>
    );
}

const extensionPointContext = createContext<string>("");

interface ExtensionComponentProps {
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

interface ExtensionPointProps<T> {
    children: (props: T) => ReactElement;
    fallback?: ReactElement;
    filter?: (definition: T) => boolean;
    name: string;
}

export function ExtensionPoint<T>({ children, fallback = <Fragment />, filter, name }: ExtensionPointProps<T>) {
    const { locale } = useIntl();
    const { resources } = useContext(extensionContext);
    const definitions = Object.keys(resources).reduce((acc: Record<string, T>, val) => {
        const definition = getExtensionDefinition<Record<string, T>>(val);
        if (!definition?.default[name]) {
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
            {keys.map((key) => (
                <IntlProvider key={key} locale={locale} messages={getExtensionMessages(key, locale) || {}}>
                    {createElement(
                        extensionPointContext.Provider,
                        {
                            value: key,
                        },
                        children(definitions[key])
                    )}
                </IntlProvider>
            ))}
        </Fragment>
    );
}
