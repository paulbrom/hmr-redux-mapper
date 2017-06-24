// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
//  hmrReduxMapper - the automatic hmr component loader for redux
//  (c)2017 PureCars / Raycom Media
//  https://github.com/paulbrom/hmr-redux-mapper
//
//    main contributors:
//      Paul Broman (p.broman@yahoo.com)
//      Chris Kittredge
//
//  Released to the community under the MIT license.
//
//  This module implements the mapper loader which uses the reducerMap.js file output by the hmr-redux-mapper tool
//  to load your components, along with all redux reducers used by that component and all of its children, when a
//  route component is swapped in by hmr.
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

const _each = require('lodash/each');
const _isArray = require('lodash/isArray');
const _last = require('lodash/last');
const _reduce = require('lodash/reduce');

//
// this is the mapper loader component which is intended to be loaded from inside the childRoutes creation handler in
// react-router.  An example usage:
//
// export default function createRoutes(store) {
//   const getComponentFromReduxMapper = reduxMapperLoader({
//     store, // redux store
//     createReducer, // your implementation using react-redux
//     reducerMap, // the reducerMap.js file output by the hmr-redux-mapper tool
//   });
//
//   return [
//     {
//       path: '/',
//       name: 'home',
//       getComponent: getComponentFromReduxMapper('./containers/HomePage/index.js'),
//     }, {
//       path: '/features',
//       name: 'features',
//       getComponent: getComponentFromReduxMapper('./containers/FeaturePage'),
//     }, {
//       path: '*',
//       name: 'notfound',
//       getComponent: getComponentFromReduxMapper('./containers/NotFoundPage'),
//     },
//   },
// ];
//
const reduxMapperLoader = ({
  store,                        // from redux
  createReducer,                // your implementation using react-redux
  reducerMap,                   // the reducerMap.js file output by hmr-redux-mapper
  injectReducer,                // your implementation of injectAsyncReducer, optional
  injectSagas,                  // your implementation of injectSagas, optional
  loadModule,                   // your implementation of loadModule, optional
  errorLoading = (err) => {}    // your implementation of an error handler, optional
}) => {
  // see if we should use default implementations for injectReducer/injectSagas/loadModule
  const loadModuleDefault = (cb) => (componentModule) => {
    cb(null, componentModule.default);
  };
  loadModule = loadModule || loadModuleDefault;
  const injectAsyncReducerDefault = (name, asyncReducer) => {
    if (Reflect.has(store.asyncReducers, name)) return;
    store.asyncReducers[name] = asyncReducer;
    store.replaceReducer(createReducer(store.asyncReducers));
  };
  injectReducer = injectReducer || injectAsyncReducerDefault;
  const injectAsyncSagasDefault = (asyncSagas) => {
    if (!_isArray(asyncSagas)) {
      // this is to cope with a unit test issue...
      asyncSagas = [asyncSagas];
    }
    asyncSagas.map(store.runSaga);
  };
  injectSagas = injectSagas || injectAsyncSagasDefault;

  // handles callback from react-redux which requests component for a route
  // you only need to provide the path to the component module
  const getComponentFromReduxMapper = componentPath =>
    (nextState, cb) => {
      return new Promise((resolve, reject) => {
        // get the component from the mapper file
        const componentMap = reducerMap.containerSpecific[componentPath];
        if (componentMap) {
          // create a promise to load each reducer, as well as a promise to load the component itself
          Promise.all(_reduce(componentMap.reducers, (imports, reducerCur) => {
            imports.push(reducerCur.importFunc());
            if (reducerCur.sagaImportFunc) {
              imports.push(reducerCur.sagaImportFunc());
            }
            return imports;
          }, []).concat([componentMap.importFunc()])).then(promiseResults => {
            // once all promises are loaded, inject all reducers/sagas
            let resultOn = 0;
            _each(componentMap.reducers, reducerCur => {
              injectReducer(reducerCur.reducerName, promiseResults[resultOn++].default);
              if (reducerCur.sagaImportFunc) {
                injectSagas(promiseResults[resultOn++].default);
              }
            });
            // finally, load and render the route
            loadModule(cb)(_last(promiseResults));
            resolve();
          }).catch((err) => {
            errorLoading(err);
            reject(err);
          });
        } else {
          const err = `no module in reducerMap at ${componentPath}`;
          errorLoading(err);
          reject(err);
        }
      });
    };
  return getComponentFromReduxMapper;
};

module.exports = reduxMapperLoader;

