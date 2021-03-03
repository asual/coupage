# <img height="40" src="coupage.svg" valign="text-bottom"> Coupage

Coupage (/ku.paʒ/) is a tiny toolkit that aims to simplify the creation of extensible browser-based applications. It
implements a mechanism that loads extensions inside a host application and takes care of shared dependencies.

Coupage provides a compact set of interfaces and build utilities that implement the following characteristics:

-   Statically typed code-based contract between an application and it's extensions
-   Built-in internationalization, performance and security
-   Optimal development experience for extension authors

Coupage offers a simple, yet flexible extensibility model that is capable of addressing the foundational requirements of
a modern micro-frontend architecture.

## Concepts and Terminology

Many software systems support some form of extensibility due to functional, organizational or ecosystem requirements.
It can be implemented in a static or dynamic manner and additional packages are often called modules or plugins. Coupage
is not much different but uses the following terminology:

### Extension

An implementation of a particular functionality that is built separately and can be dynamically loaded into a host
application.

### Extension Point

A specific area of the host application that is capable of handling extension contributions. It can be a navigation
menu, a content block or something else.

### Extension Definition

A description of all extension points that are supported by a given extension. It may contain program code that will be
executed by the host application.

## Packages

Coupage consists of several packages that contribute to different aspects of the overall concept.

### [@coupage/core](https://github.com/asual/coupage/tree/master/packages/core)

A zero-dependency extension loading implementation that takes care of resource handling in both development and
production environments.

### [@coupage/cli](https://github.com/asual/coupage/tree/master/packages/cli)

A wrapper around a custom [Webpack](https://github.com/webpack/webpack) configuration that simplifies the build and
internationalization needs of a typical Coupage project.

### [@coupage/react](https://github.com/asual/coupage/tree/master/packages/react)

An implementation that targets [React](https://github.com/facebook/react) and uses some of the popular ecosystem
packages.

Coupage utilizes technologies like [Webpack](https://github.com/webpack/webpack) and
[AMD](https://github.com/amdjs/amdjs-api) but this will very likely change as the ESM tooling support evolves. The core
implementation is framework-agnostic and can provide support for other popular libraries besides React.

## Sample

A sample application that showcases the current set of capabilities is available in a
[dedicated repository](https://github.com/asual/coupage-react-sample).
