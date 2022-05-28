# @coupage/cli

The Coupage CLI package provides a wrapper around a set of predefined [Webpack](https://github.com/webpack/webpack)
configurations that are suitable for application and extension development. It enables features and plugins similar to
the ones used by [react-scripts](https://github.com/facebook/create-react-app/tree/master/packages/react-scripts) but
adds internationalization and extension development capabilities.

The use of the Coupage CLI is completely optional but it can reduce the configuration overhead that each extention
requires. The behavior of the CLI can be overriden by a local webpack.config.ts file.

## Commands

All commands can be used in the context of both applications and extensions. The package type detection relies on
the fact that an application doesn't require a `peerDependencies` entry inside it's `package.json` while extensions
typically need it.

### `coupage build`

Produces a production build of the package, bundle analysis and code coverage report.

### `coupage serve`

Launches a local server that handles extension development in the context of the host application.
