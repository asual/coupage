# @coupage/core

The Coupage Core package provides a set of APIs that enable type-safe extension definition and flexible resource
loading. The implementation handles both optimal development experience as well as optimized production performance.

## API

The package offers APIs which are suitable for either application developers or integration packages like
[@coupage/react](https://github.com/asual/coupage/tree/master/packages/react).

### Developer APIs

Preload all extension definitions and related resources.

```typescript
function preloadResources(resources: Resources, locale: string, nonce?: string): void;
```

Create a definition for a particular extension while using a predefined common template.

```typescript
function createExtensionDefinition<T>(definitionTemplate: T, definition: T): T;
```

Create an empty extension point definition that contains nothing but type information.

```typescript
function createExtensionPointDefinition<T>(): T;
```

Extract extension point names out of an extension definition template.

```typescript
function extractExtensionPointNames<T>(definitionTemplate: T): Record<keyof T, string>;
```

### Integration APIs

Extension module containing a default export.

```typescript
interface ExtensionModule<T = unknown> {
    default: T;
}
```

Extension resources type structure.

```typescript
interface ExtensionResources {
    messages?: Record<string, string>;
    scripts: Record<string, string>;
    styles?: Record<string, string>;
}
```

Provide a cached copy of a given extension internationalization messages if such are available.

```typescript
function getExtensionMessages(extensionName: string, locale: string): Record<string, string> | void;
```

Provide a cached copy of a given extension definition if such is available.

```typescript
function getExtensionDefinition<T = unknown>(extensionName: string): ExtensionModule<T> | void;
```

Load the main entry point of an extension and return a particular extension point content.

```typescript
function loadExtensionPoint<T = unknown>(
    extensionName: string,
    extensionPointName: string,
    extensionResources: ExtensionResources,
    dependencies: Record<string, unknown>,
    nonce?: string
): Promise<ExtensionModule<T>>;
```

Load all extension definitions and related resources.

```typescript
function loadResources(
    resources: Resources,
    dependencies: Record<string, unknown>,
    locale: string,
    nonce?: string
): Promise<void>;
```
