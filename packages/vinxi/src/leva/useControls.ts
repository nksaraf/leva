import { useEffect, useMemo, useCallback, useState, useRef } from 'react'
import { levaStore } from './store'
import { folder } from './helpers'
import { useDeepMemo, useValuesForPath } from './hooks'
import { useRenderRoot } from './components/Leva'
import type { FolderSettings, Schema, SchemaToValues, State, StoreType } from './types'
import shallow from 'zustand/shallow'

type HookSettings<TState extends State, TStore extends StoreType<TState>> = { store?: TStore }
type SchemaOrFn<S extends Schema = Schema> = S | (() => S)

type FunctionReturnType<S extends Schema> = [SchemaToValues<S>, (value: Partial<SchemaToValues<S, true>>) => void]

type ReturnType<F extends SchemaOrFn> = F extends SchemaOrFn<infer S>
  ? F extends Function
    ? FunctionReturnType<S>
    : SchemaToValues<S>
  : never

type HookReturnType<F extends SchemaOrFn | string, G extends SchemaOrFn> = F extends SchemaOrFn
  ? ReturnType<F>
  : ReturnType<G>

function parseArgs< TState extends State, TStore extends StoreType<TState>>(
  schemaOrFolderName: string | SchemaOrFn,
  settingsOrDepsOrSchema?: HookSettings<TState, TStore> | React.DependencyList | SchemaOrFn,
  depsOrSettingsOrFolderSettings?: React.DependencyList | HookSettings<TState, TStore> | FolderSettings,
  depsOrSettings?: React.DependencyList | HookSettings<TState, TStore>,
  depsOrUndefined?: React.DependencyList
) {
  let schema: SchemaOrFn
  let folderName: string | undefined = undefined
  let folderSettings: FolderSettings | undefined
  let hookSettings: HookSettings<TState, TStore> | undefined
  let deps: React.DependencyList | undefined

  if (typeof schemaOrFolderName === 'string') {
    folderName = schemaOrFolderName
    schema = settingsOrDepsOrSchema as SchemaOrFn
    if (Array.isArray(depsOrSettingsOrFolderSettings)) {
      deps = depsOrSettingsOrFolderSettings
    } else {
      if (depsOrSettingsOrFolderSettings) {
        if ('store' in depsOrSettingsOrFolderSettings) {
          hookSettings = depsOrSettingsOrFolderSettings as HookSettings<TState, TStore>
          deps = depsOrSettings as React.DependencyList
        } else {
          folderSettings = depsOrSettingsOrFolderSettings as FolderSettings
          if (Array.isArray(depsOrSettings)) {
            deps = depsOrSettings as React.DependencyList
          } else {
            hookSettings = depsOrSettings as HookSettings<TState, TStore>
            deps = depsOrUndefined
          }
        }
      }
    }
  } else {
    schema = schemaOrFolderName as SchemaOrFn
    if (Array.isArray(settingsOrDepsOrSchema)) {
      deps = settingsOrDepsOrSchema as React.DependencyList
    } else {
      hookSettings = settingsOrDepsOrSchema as HookSettings<TState, TStore>
      deps = depsOrSettingsOrFolderSettings as React.DependencyList
    }
  }

  return { schema, folderName, folderSettings, hookSettings, deps: deps || [] }
}

/**
 *
 * @param schemaOrFolderName
 * @param settingsOrDepsOrSchema
 * @param folderSettingsOrDeps
 * @param depsOrUndefined
 */
export function useControls<S extends Schema, F extends SchemaOrFn<S> | string, G extends SchemaOrFn<S>, TState extends State, TStore extends StoreType<TState>>(
  schemaOrFolderName: F,
  settingsOrDepsOrSchema?: HookSettings<TState, TStore> | React.DependencyList | G,
  depsOrSettingsOrFolderSettings?: React.DependencyList | HookSettings<TState, TStore> | FolderSettings,
  depsOrSettings?: React.DependencyList | HookSettings<TState, TStore>,
  depsOrUndefined?: React.DependencyList
): HookReturnType<F, G> {
  // We parse the args
  const { folderName, schema, folderSettings, hookSettings, deps } = parseArgs(
    schemaOrFolderName,
    settingsOrDepsOrSchema,
    depsOrSettingsOrFolderSettings,
    depsOrSettings,
    depsOrUndefined
  )

  const schemaIsFunction = typeof schema === 'function'

  // Keep track of deps to see if they changed and if there's need to recompute.
  const depsChanged = useRef(false)
  // We will only override the store settings and options when deps have changed
  // and it isn't the first render
  const firstRender = useRef(true)

  // Since the schema object would change on every render, we let the user have
  // control over when it should trigger a reset of the hook inputs.
  const _schema = useDeepMemo(() => {
    depsChanged.current = true
    const s = typeof schema === 'function' ? schema() : schema
    return folderName ? { [folderName]: folder(s, folderSettings) } : s
  }, deps)

  // GlobalPanel means that no store was provided, therefore we're using the levaStore
  const isGlobalPanel = !hookSettings?.store

  useRenderRoot(isGlobalPanel)
  const [__store] = useState(() => hookSettings?.store || levaStore )
  const store = __store as StoreType
  /**
   * Parses the schema to extract the inputs initial data.
   *
   * This initial data will be used to initialize the store.
   *
   * Note that getDataFromSchema recursively
   * parses the schema inside nested folder.
   */
  const [initialData, mappedPaths] = useMemo(() => store.getDataFromSchema(_schema), [store, _schema])
  const [allPaths, renderPaths, onChangePaths] = useMemo(() => {
    const allPaths: string[] = []
    const renderPaths: string[] = []
    const onChangePaths: Record<string, (v: any) => void> = {}
    Object.values(mappedPaths).forEach(({ path, onChange }) => {
      allPaths.push(path)
      if (!!onChange) onChangePaths[path] = onChange
      else renderPaths.push(path)
    })
    return [allPaths, renderPaths, onChangePaths]
  }, [mappedPaths])

  // Extracts the paths from the initialData and ensures order of paths.
  const paths = useMemo(() => store.orderPaths(allPaths), [allPaths, store])

  /**
   * Reactive hook returning the values from the store at given paths.
   * Essentially it flattens the keys of a nested structure.
   * For example { "folder.subfolder.valueKey": value } becomes { valueKey: value }
   *
   * initalData is going to be returned on the first render. Subsequent renders
   * will call the store data.
   * */
  const values = useValuesForPath(store, renderPaths, initialData)

  const set = useCallback(
    (values: Record<string, any>) => {
      const _values = Object.entries(values).reduce(
        (acc, [p, v]) => Object.assign(acc, { [mappedPaths[p].path]: v }),
        {}
      )
      store.set(_values)
    },
    [store, mappedPaths]
  )

  useEffect(() => {
    // We initialize the store with the initialData in useEffect.
    // Note that doing this while rendering (ie in useMemo) would make
    // things easier and remove the need for initializing useValuesForPath but
    // it breaks the ref from Monitor.

    // we override the settings when deps have changed and this isn't the first
    // render
    const shouldOverrideSettings = !firstRender.current && depsChanged.current
    store.addData(initialData, shouldOverrideSettings)
    firstRender.current = false
    depsChanged.current = false
    return () => store.disposePaths(paths)
  }, [store, paths, initialData])

  useEffect(() => {
    // let's handle transient subscriptions
    const unsubscriptions: (() => void)[] = []
    Object.entries(onChangePaths).forEach(([path, onChange]) => {
      onChange(store.get(path))
      // @ts-ignore
      const unsub = store.useStore.subscribe(onChange, (s) => s.data[path].value, shallow)
      unsubscriptions.push(unsub)
    })
    return () => unsubscriptions.forEach((unsub) => unsub())
  }, [store, onChangePaths])

  if (schemaIsFunction) return [values, set] as any
  return values as any
}
