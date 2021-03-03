# @coupage/react

The Coupage package for React provides a small set of components that enable extension integration capabilities.

## Components

The `ExtensionProvider` enables the use of a global extensibility configuration that is transparently shared with all
`ExtensionPoint` instances.

```typescript
function ExtensionProvider(props: {
    children: ReactElement | ReactElement[];
    dependencies: Record<string, unknown>;
    nonce?: string;
    resources: Resources;
});
```

The `ExtensionPoint` displays all relevant extension contributions in a particular part of a host application.

```typescript
function ExtensionPoint<T>(props: {
    children: (props: T) => ReactElement;
    fallback?: ReactElement;
    filter?: (definition: T) => boolean;
    name: string;
});
```

The `ExtensionComponent` handles the loading of the primary functionality of a particular extension.

```typescript
function ExtensionComponent(props: { fallback?: ReactElement; name: string });
```
