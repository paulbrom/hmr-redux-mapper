# Mapper Tool Configuration Options

The redux mapper tool accepts a set of configuration options.  These configuration options can be specified either by
using a `redux-mapper.json` configuration file (the preferred way) or by supplying command line arguments directly to
the tool script when invoking it with *node*.

The preferred way to configure the redux mapper tool is to create a `redux-mapper.json` file in the root folder of your
project (same location as `package.json`).  Any of the redux mapper configuration options can be specified as a member
of the `config` JSON object with the argument name as the key.

For example, mapper tool configuration option `basePath` can be specified as `foo` either directly on the command line
when executing the script like this:

``` javascript
node ./node_modules/hmr-redux-mapper/bin/hmr-redux-mapper --basePath=foo
```

Or by adding adding a `basePath` key to the `config` object in `redux-mapper.json` like this:

``` javascript
{
  "config": {
    "basePath": "foo"
  }
}
```

<h2>Mapper Tool Configuration Options</h2>

The following is a list of all configuration options.  Underneath each option name, there is a small table indicating
whether this configuration option is optional, and what the short version of the command line argument is.  For example,
option *basePath* can be specified on the command line either as argument `--basePath` or by the short version, `-b`.

<h3>Table of contents</h3>

* **[basePath](#user-content-basepath)**
* **[containerPaths](#user-content-containerpaths)**
* **[coreReducerFilenames](#user-content-coreReducerfilenames)**
* **[disableCache](#user-content-disablecache)**
* **[globalReducersOutputPath](#user-content-globalreducersoutputpath)**
* **[ignorePaths](#user-content-ignorepaths)**
* **[mainAppPath](#user-content-mainapppath)**
* **[showHelp](#user-content-showhelp)**
* **[reduxPaths](#user-content-reduxpaths)**
* **[sagaFilename](#user-content-sagafilename)**
* **[verboseLogging](#user-content-verboselogging)**

---

<h3>basePath</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-b         |

`basePath` is used to specify the the path to the root of the project's client-side script JS/JSX files, as compared to
the root of the project (location of `package.json`).

<h5>Example:</h5>

If you keep all script files for the project under `app/scripts`, you would specify that value for `basePath`.

``` javascript
{
  "config": {
    "basePath": "app/scripts"
  }
}
```

---

<h3>containerPaths</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-c         |

`containerPaths` is used to specify a comma-delimited list of paths to any folders which can contain top-level
containers which can be swapped by a hot module reload.  Any JS files under those folders will be mapped by the
hmr-redux-mapper looking for reducer usage, and the results will be placed in `reducerMap.js`.

<h5>Example:</h5>

If all swappable container UI javascript for your project can be found underneath `app/scripts/containers`,
then that can be specified using `basePath` and `containerPaths` like this:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "containerPaths": "containers"
  }
}
```

---

<h3>coreReducerFilenames</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-f         |

If you keep all redux files related to a single redux store in the same folder, and don't place other script unrelated
to the redux store in those same folders, and use a standard set of filenames in all your redux stores, then you can
specify this option to avoid the need to specify a *PRM_FILES_FOR_REDUCER_NAME* in your redux store-related files that
can be imported from a component or container, like action files.  Files which are not directly referenced from
components or containers, like reducer files, do not need to be specified here.

<h5>Example:</h5>

Let's say that all your redux stores are each in their own separate folders, and each has a file called `actions.js`
which is used to import redux actions, and maybe also optionally a `helpers.js` containing utility functions
corresponding to that store which can be used directly from components or containers.  In that case, you can specify
that structure like this:

``` javascript
{
  "config": {
    "coreReducerFilenames": "actions.js,helpers.js"
  }
}
```

---

<h3>disableCache</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-d         |

`disableCache` is used to disable the internal file caching used in the redux mapper tool.  Disabling this cache will
cause the mapper tool to take much longer to execute.  This option is useful for debugging the redux mapper tool itself
and should not need to be specified in an integration.

---

<h3>globalReducersOutputPath</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-g         |

`globalReducersOutputPath` is used to specify the the path to output a file, typically named `globalReducers.js`, which
can be imported to import all the reducers used globally (that is, all reducers used by the component specified at
configuration option `mainAppPath` or any of its subcomponents).  Reducers which are used globally do not need to be
swapped (they must always be loaded) and are only referenced in globalReducers.js, not in reducerMap.js.

<h5>Example:</h5>

If the main file of your project is located at `app/scripts/main/main.jsx`, and you want to output global reducers
used by that files to `app/scripts/redux/globalReducers.js`, then that can be specified using `basePath`, `mainAppPath`,
and `globalReducersOutputPath` like this:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "globalReducersOutputPath": "redux/globalReducers.js",
    "mainAppPath": "main/main.jsx",
  }
}
```

---

<h3>ignorePaths</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-i         |

`ignorePaths` is used to specify any paths or filenames to ignore when mapping components for redux usage.  The value
supplied will be treated as a Javascript regular expression.

<h5>Example:</h5>

If your project has unit test files where the filenames end with `-spec.js`, and unit test files can be found under the
path(s) you specified using `containerPaths`, you can ensure those unit test files are not mapped and don't contribute
to bloat in `reducerMap.js` like this:

``` javascript
{
  "config": {
    "ignorePaths": "-spec.js",
  }
}
```

---

<h3>mainAppPath</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-a         |

`mainAppPath` is used to specify the the path to the root component of your application that is always loaded (never
swapped out by hot module reloads).  The path specified is relative to the path specified in `basePath`.  Any reducers
used by the module at this path, or any of its submodules, will be considered *global* and included in the
`globalReducers.js` file (and not in `reducerMap.js`, since they do not need to be hot-swapped).

<h5>Example:</h5>

If the main file of your project is located at `app/scripts/main/main.jsx`, then that can be specified using `basePath`
and `mainAppPath` like this:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "mainAppPath": "main/main.jsx"
  }
}
```

---

<h3>showHelp</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-h         |

`showHelp` can be used at command line, when running the redux-mapper tool, to show information on how to use the tool,
similar to what you are reading here.

---

<h3>reducerMapOutputPath</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-m         |

`reducerMapOutputPath` is used to specify the the path to output a file, typically named `reducerMap.js`, which is
consumed by the integration module to determine which files need to swapped in on route change.

<h5>Example:</h5>

If all swappable UI containers for your project can be found underneath `app/scripts/containers`, and you want to output
the reducer map to `app/scripts/redux/reducerMap.js`, then that can be specified using `basePath`, `containerPath`,
and `reducerMapOutputPath` like this:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "reducerMapOutputPath": "redux/reducerMap.js",
    "mainAppPath": "main/main.jsx",
  }
}
```

---

<h3>reduxPaths</h3>

|Optional|Short Param|
|:------:|:---------:|
|no      |-r         |

`reduxPaths` is used to specify a comma-delimited set of paths in your project where redux reducer files can be found.
Depending on the structure of your project, this can be same as what you specify for `containerPaths`.

<h5>Example:</h5>

If all swappable UI containers for your project can be found underneath `app/scripts/containers`, but all your redux
reducers are found under `app/scripts/redux`, then that can be specified using `basePath`, `containerPath`, and
`reduxPaths` like this:

``` javascript
{
  "config": {
    "basePath": "app/scripts",
    "reduxPaths": "redux",
    "mainAppPath": "main/main.jsx",
  }
}
```

---

<h3>sagaFilename</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-s         |

If you keep all redux files related to a single redux store in the same folder, and use redux sagas, and always use the
same filename to contain any redux sagas, then you can specify this option to avoid the need to specify a
*PRM_SAGAS_FOR_REDUCER_NAME* in your redux store-related files.

<h5>Example:</h5>

Let's say that all your redux stores are each in their own separate folders, and each has a file called `sagas.js`
which is used to contain redux sagas, you can specify that structure like this:

``` javascript
{
  "config": {
    "sagaFilename": "sagas.js"
  }
}
```

---

<h3>verboseLogging</h3>

|Optional|Short Param|
|:------:|:---------:|
|yes     |-h         |

`verboseLogging` can be used to turn on verbose output from the tool.  This is useful for debugging either integration
problems or bugs in the redux mapper tool itself.