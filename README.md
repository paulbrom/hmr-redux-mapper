[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]

<div align="center">
  <a href="https://github.com/paulbrom/hmr-redux-mapper">
    <img src="https://raw.githubusercontent.com/paulbrom/hmr-redux-mapper/master/assets/redux-mapper-logo.png">
  </a>
  <h1>HMR Redux Mapper</h1>
</div>

<h2 align="center">Why?</h2>

<p>If you have written Redux applications in a hot-module-reloading environment, you have probably written a significant
amount of boilerplate code in your routing handler to hot-swap all the Redux reducer and saga modules needed to render
each route.  Adding new Redux stores to existing shared components requires each route using those shared components to
swap in those new stores, but it can be tedious to manually determine exactly which routes end up using these shared
components so that this requirement can be satisfied.</p>

<p>Enter hmr-redux-mapper, which is a build tool whose purpose is to eliminate the need to manually specify the Redux
components which are needed for hot swapping upon route change.  The tool is designed to recursively walk each component
in your project, starting at each route container, looking for all the Redux modules that are imported either directly
by the route container or by any of its child components.  That information is written in a mapping file (reducerMap.js).</p>

<p>You can then use the reduxMapperLoader integration module to automatically hot-swap all the Redux modules needed for
a new route without the need to write any boilerplate code in your routing handlers to manually load the necessary
modules.</p>

<h2 align="center">Install</h2>

```
npm install hmr-redux-ampper --save-dev
```

<h2 align="center">Usage</h2>

<p>The following usage instructions are specific to React, and specifically to react-router, but in theory similar
principles should apply to other Redux HMR environments where modules need to be swapped on route change.</p>

<p>First, ensure the Redux mapper tool is run early in the build process (before webpack or browserify).  If you use npm
to perform your build, you can add lines similar to these to the "scripts" section of package.json:</p>

``` javascript
"scripts": {
   ...
   "redux-mapper": "node ./node_modules/hmr-redux-mapper/bin/hmr-redux-mapper",
   "prebuild": "npm run build:clean && npm run redux-mapper",
   ...
},
```

<p>If you use gulp, grunt, or another build tool, you simply need to ensure that you use the proper methodology for
those tools to run hmr-redux-mapper as a node script early in the build process (before webpack or browserify).</p>

<p>The build tool will look for a redux-mapper.json file in the root of your project that specifies some details about
the way your project folders are laid out, such as what subfolder paths in your project can potentially contain
route-handling components or Redux modules, what kind of filenames your Redux stores are implemented using (e.g.,
reducer.js, saga.js, etc), and where to output the resulting mapper files.  More details on the available build tool
configuration options and how to specify them to meet the needs of your project can be found in the API documentation.</p>

<p>Here is an example of the version of the file that is needed to integrate with react-boilerplate:</p>

``` javascript
{
  "config": {
    "basePath": "app",
    "mainAppPath": "utils/request.js",
    "containerPaths": "containers,components",
    "coreReducerFilenames": "actions.js,selectors.js",
    "globalImportsOutputPath": "globalReducerImports.js",
    "reducerMapOutputPath": "reducerMap.js",
    "reduxPaths": "containers",
    "sagaFilename": "sagas.js"
  }
}
}));
```

Once you have configured the build tool itself, you need to decorate each Redux reducer file with an constant that
provides a name for the reducer for mapping purposes:

``` javascript
// this is needed for hmr-redux-mapper to identify the reducer name for this reducer
export const PRM_REDUCER_NAME = 'home';
```

<p>Finally, remove all the boilerplate code for loading Redux and component modules on route change and replace that
code with a handler from reduxMapperLoader that can load the necessary modules by referring to the reducerMap generated
by the build tool.</p>

<p>Right now, reduxMapperLoader only directly supports react-router.  To integrate with react-router, replace any
getComponent() callbacks inside of your implementation of createRoutes() calls to reduxMapperLoader's
getComponentFromReduxMapper() function.</p>

<p>Consider this example diff showing how to replace boilerplate component loading code with the
reduxMapperLoader (this example diff is based on app/routes.js from react-boilerplate):</p>

``` javascript
+import reduxMapperLoader from 'hmr-redux-mapper';
+import reducerMap from './reducerMap';

export default function createRoutes(store) {
   // create reusable async injectors using getAsyncInjectors factory
   const { injectReducer, injectSagas } = getAsyncInjectors(store);

+  const getComponentFromReduxMapper = reduxMapperLoader({
+    store,
+    createReducer,
+    reducerMap,
+    injectReducer,
+    injectSagas,
+    loadModule,
+    errorLoading,
+  });
+
   return [
     {
       path: '/',
       name: 'home',
-      getComponent(nextState, cb) {
-        const importModules = Promise.all([
-          import('containers/HomePage/reducer'),
-          import('containers/HomePage/sagas'),
-          import('containers/HomePage'),
-        ]);
-
-        const renderRoute = loadModule(cb);
-
-        importModules.then(([reducer, sagas, component]) => {
-          injectReducer('home', reducer.default);
-          injectSagas(sagas.default);
-
-          renderRoute(component);
-        });
-
-        importModules.catch(errorLoading);
-      },
+      getComponent: getComponentFromReduxMapper('./containers/HomePage/index.js'),
     }, {
       path: '/features',
       name: 'features',
-      getComponent(nextState, cb) {
-        import('containers/FeaturePage')
-          .then(loadModule(cb))
-          .catch(errorLoading);
-      },
+      getComponent: getComponentFromReduxMapper('./containers/FeaturePage'),
     }, {
       path: '*',
       name: 'notfound',
-      getComponent(nextState, cb) {
-        import('containers/NotFoundPage')
-          .then(loadModule(cb))
-          .catch(errorLoading);
-      },
+      getComponent: getComponentFromReduxMapper('./containers/NotFoundPage'),
     },
   ];
 }
```

That's right - all you need to do to implement react-router's getComponent call is specify the path to the component!
All of the necessary Redux modules and the React component itself will be injected automatically on route change by
the getCompoenntFromReduxMapper, using the data collected by the build tool.

<h2 align="center">Contributing</h2>

Don't hesitate to create a pull request.  Right now we only offer direct support for npm-built React projects using
react-router, and we hope that the community can help integrate this tool with other Redux HMR environments.  Any
contribution will be greatly appreciated!

<h2 align="center">Maintainers</h2>

<div style="display: flex; flex-direction: column;">
  <img width="150 height="150"
    src="https://avatars.githubusercontent.com/paulbrom">
  <a href="https://github.com/paulbrom">Paul Broman</a>
  <div>Senior Front-End Engineer</div>
  <div>PureCars/Raycom Media</div>
</div>

<h2 align="center">LICENSE</h2>

#### [MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/webpack-dev-middleware.svg
[npm-url]: https://npmjs.com/package/webpack-dev-middleware

[node]: https://img.shields.io/node/v/webpack-dev-middleware.svg
[node-url]: https://nodejs.org

[deps]: https://david-dm.org/webpack/webpack-dev-middleware.svg
[deps-url]: https://david-dm.org/webpack/webpack-dev-middleware

[tests]: http://img.shields.io/travis/webpack/webpack-dev-middleware.svg
[tests-url]: https://travis-ci.org/webpack/webpack-dev-middleware