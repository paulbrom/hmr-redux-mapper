const _ = require('lodash');
const reduxMapperLoader = require('../src/mapper-loader.js');
const reducerMapSimpleCombined = require('../../mapper-tool/tests/data/simple-combined/results/expected/reducerMap.js');


describe("Integration mapper loader test suite", () => {
  let callsSeen = [];
  let dummyState = {};

  const mockReduxStore = {
    asyncReducers: {},
    replaceReducer: (reducers) => {
      callsSeen.push({
        type: 'replaceReducer',
        reducers: _.cloneDeep(reducers),
      });
    },
    runSaga: (saga) => {
      callsSeen.push({
        type: 'runSaga',
        saga: _.cloneDeep(saga),
      });
    },
  };

  const createReducer = (asyncReducers) => {
    callsSeen.push({
      type: 'createReducer',
      asyncReducers,
    });
    return asyncReducers;
  };

  const injectReducerCustom = (name, asyncReducer) => {
    callsSeen.push({
      type: 'injectReducerCustom',
      name,
      asyncReducer,
    });
  };

  const injectSagasCustom = (asyncSagas) => {
    callsSeen.push({
      type: 'injectSagasCustom',
      asyncSagas,
    });
  };

  const loadModuleCustom = (cb) => (componentModule) => {
    callsSeen.push({
      type: 'loadModuleCustom',
      componentModule,
    });
    cb(null, componentModule.default);
  };

  const errorLoading = (err) => {
    callsSeen.push({
      type: 'errorLoading',
      err,
    });
  };

  const dummyHMRCallback = (next, componentModule) => {
    callsSeen.push({
      type: 'dummyHMRCallback',
      componentModule,
    });
  };

  const initReduxMapperLoader = (reducerMap, useCustomCallbacks) => {
    return reduxMapperLoader({
      store: mockReduxStore,
      createReducer,
      reducerMap,
      injectReducer: useCustomCallbacks ? injectReducerCustom : undefined,
      injectSagas: useCustomCallbacks ? injectSagasCustom : undefined,
      loadModule: useCustomCallbacks ? loadModuleCustom : undefined,
      errorLoading,
    });
  };

  const validateAllComponentInjections = (getComponentFromReduxMapper, injections) => {
    const injectionCur = injections.pop();
    if (injectionCur) {
      callsSeen = [];
      mockReduxStore.asyncReducers = {};

      const validateCalls = () => {
        _.each(injectionCur.expectedCalls, (expectedCallCur, expectedCallIndex) => {
          expect(_.isEqual(callsSeen[expectedCallIndex], expectedCallCur))
            .toEqualContext(true, `component: ${injectionCur.componentPath}, expected call #${expectedCallIndex} was ` +
              `${JSON.stringify(callsSeen[expectedCallIndex])}, expected ${JSON.stringify(expectedCallCur)}`);
        });
      };

      return getComponentFromReduxMapper(injectionCur.componentPath)(dummyState, dummyHMRCallback).then(() => {
        console.error('++ CALLS SEEN:', JSON.stringify(callsSeen));
        validateCalls();
        return validateAllComponentInjections(getComponentFromReduxMapper, injections);
      }).catch((err) => {
        console.error('++ ERROR CALLS SEEN:', JSON.stringify(callsSeen));
        validateCalls();
        return Promise.resolve(err);
      });
    }
    return Promise.resolve();
  };

  beforeEach(() => {
    callsSeen = [];
    dummyState = {};

    jasmine.addMatchers({
      toEqualContext: (util) => {
        return {
          compare: (actual, expected, context) => {
            return {
              pass: util.equals(actual, expected),
              message: `Expected '${actual}' to equal '${expected}'. Context: ${context}`,
            };
          },
        };
      },
    });

    window.System = {
      import: (path) => {
        callsSeen.push({
          type: 'import',
          path,
        });
        return Promise.resolve({
          'default': path,
        });
      },
    };
  });

  it("handle simple component loads with default handlers", (done) => {
    const getComponentFromReduxMapper = initReduxMapperLoader(reducerMapSimpleCombined, false /*useCustomCallbacks*/);
    expect(_.isFunction(getComponentFromReduxMapper)).toBe(true);

    validateAllComponentInjections(getComponentFromReduxMapper, [{
      componentPath: './containers/container1.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'import',
        path: './containers/container1',
      }, {
        type: 'createReducer',
        asyncReducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        },
      }, {
        type: 'replaceReducer',
        reducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        },
      }, {
        type: 'dummyHMRCallback',
        componentModule: './containers/container1',
      }],
    }, {
      componentPath: './containers/container2.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'import',
        path: './containers/container2',
      }, {
        type: 'createReducer',
        asyncReducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        },
      }, {
        type: 'replaceReducer',
        reducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        },
      }, {
        type: 'dummyHMRCallback',
        componentModule: './containers/container2',
      }],
    }, {
      componentPath: './containers/container3.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
      }, {
        type: 'import',
        path: './containers/container3',
      }, {
        type: 'createReducer',
        asyncReducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
          store3: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
        },
      }, {
        type: 'replaceReducer',
        reducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        },
      }, {
        type: 'createReducer',
        asyncReducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
          store3: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
        },
      }, {
        type: 'replaceReducer',
        reducers: {
          store1: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
          store3: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
        },
      }, {
        type: 'dummyHMRCallback',
        componentModule: './containers/container3',
      }],
    }].reverse()).then(() => {
      done();
    });
  });

  it("handle simple component loads with custom handlers", (done) => {
    const getComponentFromReduxMapper = initReduxMapperLoader(reducerMapSimpleCombined, true /*useCustomCallbacks*/);
    expect(_.isFunction(getComponentFromReduxMapper)).toBe(true);

    validateAllComponentInjections(getComponentFromReduxMapper, [{
      componentPath: './containers/container1.jsx',
      expectedCalls: [{
          type: 'import',
          path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        }, {
          type: 'import',
          path: './containers/container1',
        }, {
          type: 'injectReducerCustom',
          name: 'store1',
          asyncReducer: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
        }, {
          type: 'loadModuleCustom',
          componentModule: {
            'default': './containers/container1',
          },
        }, {
          type: 'dummyHMRCallback',
          componentModule: './containers/container1',
        }],
    }, {
      componentPath: './containers/container2.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'import',
        path: './containers/container2',
      }, {
        type: 'injectReducerCustom',
        name: 'store1',
        asyncReducer: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'loadModuleCustom',
        componentModule: {
          'default': './containers/container2',
        },
      }, {
        type: 'dummyHMRCallback',
        componentModule: './containers/container2',
      }],
    }, {
      componentPath: './containers/container3.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
      }, {
        type: 'import',
        path: './containers/container3',
      }, {
        type: 'injectReducerCustom',
        name: 'store1',
        asyncReducer: 'mapper-tool/tests/data/simple-combined/components/store1_reducer',
      }, {
        type: 'injectReducerCustom',
        name: 'store3',
        asyncReducer: 'mapper-tool/tests/data/simple-combined/components/store3_reducer',
      }, {
        type: 'loadModuleCustom',
        componentModule: {
          'default': './containers/container3',
        },
      }, {
        type: 'dummyHMRCallback',
        componentModule: './containers/container3',
      }],
    }].reverse()).then(() => {
      done();
    });
  });

  it("throw an error when you request an invalid container", (done) => {
    const getComponentFromReduxMapper = initReduxMapperLoader(reducerMapSimpleCombined, false /*useCustomCallbacks*/);
    expect(_.isFunction(getComponentFromReduxMapper)).toBe(true);

    validateAllComponentInjections(getComponentFromReduxMapper, [{
      componentPath: './containers/not-exist.jsx',
      expectedCalls: [{
        type: 'errorLoading',
        err: 'no module in reducerMap at ./containers/not-exist.jsx'
      }],
    }].reverse()).then((err) => {
      expect(err).toEqual('no module in reducerMap at ./containers/not-exist.jsx');
      done();
    });
  });

  it("throw an error when an import fails", (done) => {
    window.System = {
      import: (path) => {
        callsSeen.push({
          type: 'import',
          path,
        });
        return Promise.reject('unknown error');
      },
    };

    const getComponentFromReduxMapper = initReduxMapperLoader(reducerMapSimpleCombined, false /*useCustomCallbacks*/);
    expect(_.isFunction(getComponentFromReduxMapper)).toBe(true);

    validateAllComponentInjections(getComponentFromReduxMapper, [{
      componentPath: './containers/container1.jsx',
      expectedCalls: [{
        type: 'import',
        path: 'mapper-tool/tests/data/simple-combined/components/store1_reducer'
      }, {
        type: 'import',
        path: './containers/container1'
      }, {
        type: 'errorLoading',
        err: 'unknown error'
      }],
    }].reverse()).then((err) => {
      expect(err).toEqual('unknown error');
      done();
    });
  });

});

