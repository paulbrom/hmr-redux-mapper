# Mapper Tool Integration Guide

Please note that at this time, **the redux-mapper is only designed to integrate closely with [React](https://facebook.github.io/react/)**,
specifically with [react-router](https://github.com/ReactTraining/react-router).   In the future, documentation for
integration with other Redux implementations will be included as support for them becomes available.  If you would like
to volunteer to add such support, please see the contributing file for more details.

<h3>What does the redux-mapper need to know about your project?</h3>

The redux-mapper needs to be configured so that it can find:

* All the script related to each individually swappable reducer module
* All the individually swappable containers (separated by route)
* The main container of your application, which cannot be swapped (and usually contains global redux stores)

Additionally, it is necessary to specify:

* The *name* of each swappable reducer module
* If you use redux-sagas, how to distinguish between script for the saga vs. the reducer
* Where to output the resulting redux map files

And optionally, you can configure:

* Specific files and folders to ignore (so files not part of your project build, such as unit test files, will not be mapped)
* Certain debugging options

<h3>Specifying the redux-mapper configuration</h3>

The preferred way to configure the redux-mapper tool is to create a `redux-mapper.json` file in the root folder of your
project (same location as `package.json`).  Any of the redux-mapper configuration options can be specified as a member
of the `config` JSON object with the argument name as the key.

Here is an example of a minimal configuration:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "containerPaths": "containers",
    "mainAppPath": "containers/main.jsx",
    "reduxPaths": "redux",
    "actionFilenames": "actions.js",
    "globalReducersOutputPath": "redux/globalReducers.js",
    "reducerMapOutputPath": "redux/reducerMap.js",
  }
}
```

<h3>How do I decide what to place in my configuration file?</h3>

The above example configuration corresponds to a project folder structure like this:

```
project_root/package.json
project_root/app
project_root/app/scripts
project_root/app/scripts/containers
project_root/app/scripts/containers/main.jsx
project_root/app/scripts/redux
project_root/app/scripts/redux/store1
project_root/app/scripts/redux/store1/actions.js
project_root/app/scripts/redux/store2
project_root/app/scripts/redux/store2/actions.js
```

In such a structure, the root folder of the project is `project_root` (where `package.json` is located).   All the
buildable frontend scripts for the project are found in subfolder `app/scripts` as compared to the project root
folder.  This root script folder is be referred to as the *base folder*.  All containers are then found under there, in
a `containers` subfolder, while all the redux stores are also found under there in a `redux` subfolder.

The specific structure of your script under the `containers` folder doesn't matter - you can place your differing
container routes in subfolders, or place them all in the `containers` folder itself.  Also, the scripts within
`containers` are free to reference whatever scripts in your project they want (and use redux stores from any of them),
since the redux-mapper will follow all imports or requires made within those files to find any usage of redux stores in
any subcomponent.  This frees you to directly work with redux stores in any of your components, even shared components,
without the need to directly keep track of all the routes using them for hot-module-reloading swap purposes.

**However**, the specific structure of your script under the `redux` folder *DOES* matter in the example configuration,
in that it is necessary for each redux store under the specified `redux` subfolder to have its action and reducer files
in the same folder, and it is also necessary that the action file for all stores uses the filename `actions.js`.
Such a redux folder configuration is called a *native* redux-mapper folder structure.

Note that such native folder structures can be supported with the containers and redux script interspersed, like this:

```
project_root/package.json
project_root/app
project_root/app/scripts
project_root/app/scripts/containers
project_root/app/scripts/containers/main/main.jsx
project_root/app/scripts/containers/container1/store1
project_root/app/scripts/containers/container1/store1/actions.js
project_root/app/scripts/containers/container2/store2
project_root/app/scripts/containers/container2/store2/actions.js
project_root/app/scripts/containers/container3/store3
project_root/app/scripts/containers/container3/store3/actions.js
```

...simply by changing `reduxPaths` in the above configuration to be the same as `containerPaths`.  As long as all
redux stores are in their own folder, and action files always use the filename `action.js` in those folders.

If your project has a redux folder structure which is not considered *native*, which means either that more than
redux store is specified in the same folder or varying filenames are used for action or reducer files, then it is
necessary to place a clue in each action file allowing the redux-mapper to know that it has found an action file,
and which redux store that action file is related to.  An example of this is:

``` javascript
export const PRM_ACTION_FILE_FOR_REDUCER = 'widgetStore';
```

<h5>Special note about redux-saga</h5>

If you use sagas from [redux-saga](https://github.com/redux-saga/redux-saga/), then it is necessary to distinguish the
saga files from the reducer files at hot module swap time.  If you have a *native* implementation and always use the
same filename for your saga file, you can specify it in `redux-mapper.json` as `sagaFilename`:

``` javascript
{
  "config": {
    "sagaFilename": "sagas.js"
  }
}
```

If, however, you have a non-native implementation, or varying filenames for your saga files, you need to provide a clue
in each saga file allowing the redux-mapper to know that it has found a saga file, and which redux store that saga file
is related to.  An example of this is:

``` javascript
export const PRM_SAGA_FILE_FOR_REDUCER = 'widgetStore';
```

<h5>Additional configuration options</h5>

An exhaustive list of additional configuration options can be found [here](Mapper_Tool_Options.md).

<h3>Specifying PRM_REDUCER_NAME constants in your reducer files</h3>

It is necessary for the redux-mapper to know the *name* of each redux store, which corresponds to the name of the
member off the redux `state` where the store contents live (e.g. `state.widgetStore`).  This name can't be automatically
determined by the redux-mapper from inspecting the reducer file, so it is necessary to specify it, in your reducer
files, like this:

``` javascript
export const PRM_REDUCER_NAME = 'widgetStore';
```

The redux-mapper will then be able to include this name in the reducerMap file for each reference to that reducer found
in a container, which is necessary to provide upon hot module swap of the reducer.

<h3>Integrating the redux-mapper tool into your project build</h3>

If you use `redux-mapper.json` to specify configuration (the preferred method), then you simply need to execute the
hmr-redux-mapper script with no arguments at some point early in your build process (before
[webpack](https://webpack.js.org/) or [browserify](http://browserify.org/)), since those modules need to bundle the
files generated by the redux-mapper).

The command to execute the redux-mapper tool from your project is:

```
node ./node_modules/hmr-redux-mapper/bin/hmr-redux-mapper
```

An example configuration to do this in an npm-based build process would be to add these entries to `package.json`:

``` javascript
"scripts": {
   ...
   "redux-mapper": "node ./node_modules/hmr-redux-mapper/bin/hmr-redux-mapper",
   "prebuild": "npm run build:clean && npm run redux-mapper",
   ...
},
```

<h3>Importing global redux stores</h3>

Global redux stores, or redux stores which are referenced from the non-swappable main application file, are output
to the path specified using the configuration option `globalReducersOutputPath`.   An example of this file is:

``` javascript
/* AUTOGENERATED FILE - DO NOT MODIFY */
/* generated by HMR_ReduxMapper */
/* https://github.com/paulbrom/hmr-redux-mapper */
import store4 from "app/scripts/redux/store4/reducer.js"
import store7 from "app/scripts/redux/store7/reducer.js"

export default {
  store4,
  store7,
};
```

This file can simply be imported and its contents sent to Redux's `combineReducers` along with any global reducers
you didn't write (such as react-router's `routerReducer`).

<h3>Importing swappable redux stores</h3>

Inside your react-router `createRoutes` implementation, import both the `reduxMapperLoader` provided with this package
as well as the reducer map file generated to the path specified using the configuration option `reducerMapOutputPath`.

Initialize the `reduxMapperLoader` by calling it with a configuration object.  That object must be passed the following
members:

* **store** - the redux store passed to `createRoutes`
* **createReducer** - your redux createReducer() implementation, which returns the combined reducers and takes the
async (swappable) reducers as the first parameter
* **reducerMap** - the reducer map file generated by the redux-mapper

Optionally, it can also be passed these members:

* **injectReducer** - a custom function to inject the async reducer on swap
* **injectSaga** - a custom function to inject the async redux saga on swap
* **loadModule** - a custom function to load a script module on swap
* **errorLoading** - a custom function to receive errors on module load

The default implementation of the above functions that you can override can be found in the source file
[here](https://github.com/paulbrom/hmr-redux-mapper/blob/master/project-integration/src/mapper-loader.js).

The `reduxMapperLoader` will return a `getComponentFromReduxMapper` function which can be passed to any `getComponent`
handler in your `createRoutes` implementation.  It requires only one argument, the path to the container module that
corresponds to the route.  All the work to inject the necessary reducers and sagas on swap will be handled by logic
within `reduxMapperLoader` and the contents of the mapper file.

The example integration with createRoutes in [react-boilerplate](https://github.com/react-boilerplate/react-boilerplate)
is as follows:


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

<h3>Troubleshooting</h3>

This should be all you need - once the redux-mapper tool is running in your build, it should issue errors in many
misconfiguration cases, but it may fail to find all your containers and redux stores without reporting errors
if you don't specify the widest possible search paths for swappable containers and redux stores in the configuration,
or if you fail to specify `PRM_REDUCER_NAME` in all reducers, or if you have a "non-native" folder configuration and
did not specify `PRM_ACTION_FILE_FOR_REDUCER` in all your action files.

In the event of problems, you can turn on verbose logging fro the tool by specifying `verboseLogging` in
`redux-mapper.json` or by adding `-v` to the hmr-redux-mapper command directly in your build script.

If you are still stumped, feel free to reach out to me directly at paulb@purecars.com.

<h3>GOOD LUCK!!</h3>