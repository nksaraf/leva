import React from 'react'
import { transition } from './states'
import { forwardRef } from 'react'

import mergeRefs from 'react-merge-refs'
import { useControls, LevaPanel } from '../src/leva'
import { createStore, editableStore, EditableStore } from './editableStore'
import { GetState, SetState, StoreApi } from 'zustand'
import { Html } from '@react-three/drei'
import { LevaPanelProps } from '../src/leva/components/Leva'
import { applyProps, Euler, GroupProps, Object3DNode, useFrame, useResource, Vector3 } from 'react-three-fiber'
import * as THREE from 'three'

// Graphics
// Animation
// Audio
// Physics
// AI
// Netcode
// Input

export interface MachineStore<S extends string, A extends { type: any }, T extends {}>
  extends EditableStore<{ data: T & { name: string; state: S }; dispatch: (action: A) => void }> {
  dispatch: (action: A) => void
}

interface MachineOptions<
  T extends {},
  S extends string,
  A extends {
    type: any
  }
> {
  data: T
  initialState: S
  name: string
  reducer: (
    action: A,
    data: T & {
      state: S
    },
    {
      get,
      set,
      store,
    }: {
      set: SetState<T>
      get: GetState<T>
      store: StoreApi<T>
    }
  ) => Partial<T> & {
    state?: S
  }
}

export const machine = <S extends string, A extends { type: any }, T extends {}>(options: MachineOptions<T, S, A>) => {
  let reducer = options.reducer ?? ((action, state) => state)
  const creator = (set, get, api) => ({
    dispatch: (action: A) => {
      let prevData = get().data
      let returned = reducer(action, prevData, { set, get, store: api })

      if (returned) {
        // @ts-ignore
        if (action.logLevel !== 'silent') {
          console.log(
            returned.state
              ? `${options.name}: ${prevData.state} --> ${action.type} --> ${returned.state}`
              : `${options.name}: ${prevData.state} => ${action.type}`,
            {
              prev: prevData,
              action,
              next: returned,
            }
          )

          logger.dispatch({
            type: 'LOG',
            // @ts-ignore
            logLevel: 'silent',
            log: returned.state
              ? `${options.name}: ${prevData.state} --> ${action.type} --> ${returned.state}`
              : `${options.name}: ${prevData.state} => ${action.type}`,
          })
        }

        set({ data: { ...prevData, ...returned } })
      }
    },
  })

  const store: MachineStore<S, A, T> = createStore(
    { data: { ...options.data, name: options.name, state: options.initialState } },
    creator
  ) as any
  store.dispatch = store.getState().dispatch
  store.useStore = store
  return store
}

const logger = machine({
  data: {
    logs: [] as string[],
  },
  name: 'logger',
  initialState: 'LOGGING',
  reducer: (action: { type: 'LOG'; log: string }, state) =>
    transition(state, action, {
      LOGGING: {
        LOG: (action, state) => {
          return { logs: [...state.logs, action.log] }
        },
      },
    }),
})

interface EntityStore
  extends MachineStore<
    'ALIVE' | 'DEAD',
    | {
        type: 'DESTROY'
      }
    | { type: 'SET_WORLD'; worldRef: any }
    | { type: 'SET_PARENT'; parent: EntityStore | null }
    | { type: 'CREATE_COMPONENT'; componentType: ComponentType<{}, any>; args: any }
    | { type: 'REMOVE_COMPONENT'; componentType: ComponentType<{}, any> }
    | { type: 'SET_DATA'; data: any }
    | {
        type: 'SET_COMPONENT'
        componentType: ComponentType<{}, any>
        component: ReturnType<ComponentType<{}, any>['create']>
      },
    {
      id: any
      type: string
      name: any
      worldRef: any
      parent: null | EntityStore
      components: Map<ComponentType<{}, any>, MachineStore<string, { type: any }, any>>
    }
  > {}

export const createEntity = ({
  name = undefined as string | undefined,
  id,
  // parent = null as null | EntityStore,
  // worldRef = null as null | any,
  // @ts-ignore
  // worldRefany,
}): EntityStore => {
  console.log('creating', name ?? id)
  return machine({
    initialState: 'ALIVE' as 'ALIVE' | 'DEAD',
    data: {
      id,
      type: '',
      name: name ?? id,
      worldRef: null as any,
      parent: null as null | EntityStore,
      components: new Map(),
    },
    name: name ?? id,
    reducer: (action, state) =>
      transition(state, action, {
        ALIVE: {
          DESTROY: (action, state) => {
            return { state: 'DEAD' }
          },
          SET_PARENT: (action, state) => {
            return { parent: action.parent }
          },
          SET_WORLD: (action, state) => {
            return { worldRef: action.worldRef }
          },
          CREATE_COMPONENT: (action, state) => {
            state.components.set(action.componentType, action.componentType.create(action.args))
            return { components: state.components }
          },
          SET_COMPONENT: (action, state) => {
            state.components.set(action.componentType, action.component)
            return { components: state.components }
          },
          REMOVE_COMPONENT: (action, state) => {
            state.components.delete(action.componentType)
            return { components: state.components }
          },
          SET_DATA: (action, state) => {
            return action.data
          },
          // SET_COMPONENT: (action, state) => {
          //   if (state.components.has(action.componentType)) {
          //     return {};
          //   } else{
          //     state.components.add()
          //   }
          // },
        },
        DEAD: {
          SET_PARENT: (action, state) => {
            return { parent: action.parent }
          },
          SET_WORLD: (action, state) => {
            return { worldRef: action.worldRef }
          },
        },
      }),
  })
}

const createComponent = function<
  T extends {},
  Args,
  S extends string = string,
  A extends { type: any } = { type: any }
>(
  config: Partial<MachineOptions<T, S, A>> & { initialData?: (args: Args) => T }
): ComponentType<T & { state: string }, Args, S, A> {
  return {
    ...config,
    create: (args: Args) => {
      if (config.initialData) {
      }
      const mach = machine({
        ...config,
        data: config.initialData ? config.initialData(args) : config.data,
      } as any) as MachineStore<S, A, T>
      //@ts-ignore
      return mach
    },
  } as any
}

type ComponentType<T, Args, S extends string = string, A extends { type: any } = { type: any }> = MachineOptions<
  T,
  S,
  A
> & { create: (args: Args) => MachineStore<S, A, T> }

export const transformComponent = createComponent({
  initialData: (props: { position?: Vector3; scale?: Vector3; rotation?: Euler }) => ({
    position: props.position ?? [0, 0, 0],
    scale: props.scale ?? [0, 0, 0],
    rotation: props.rotation ?? [0, 0, 0],
  }),
  name: 'Transform',
})

export type EntityRef = EntityStore

export const world = machine({
  initialState: 'EMPTY' as 'EMPTY' | 'ACTIVE',
  data: {
    entities: {} as Record<string | number, EntityRef>,
    components: {},
    systems: {},
    trash: {},
  },
  name: 'world',
  reducer: (
    action:
      | { type: 'CREATE_ENTITY'; id: number; parent?: EntityRef }
      | { type: 'ADD_ENTITY'; id: number; entity: EntityRef }
      | { type: 'REMOVE_ENTITY'; id: number },
    state,
    { get, set, store }
  ) =>
    transition(state, action, {
      EMPTY: {
        CREATE_ENTITY: (action, state) => {
          return {
            state: 'ACTIVE',
            entities: {
              ...state.entities,
              [action.id]: createEntity({ id: action.id, name: action.id, worldRef: store, parent: action.parent }),
            },
          }
        },
        ADD_ENTITY: (action, state) => {
          return {
            state: 'ACTIVE',
            entities: {
              ...state.entities,
              [action.id]: action.entity,
            },
          }
        },
      },
      ACTIVE: {
        CREATE_ENTITY: (action, state) => {
          return {
            entities: {
              ...state.entities,
              [action.id]: createEntity({ id: action.id, name: action.id }),
            },
          }
        },
        ADD_ENTITY: (action, state) => {
          action.entity.dispatch({ type: 'SET_WORLD', worldRef: store })
          return {
            entities: {
              ...state.entities,
              [action.id]: action.entity,
            },
          }
        },
        REMOVE_ENTITY: (action, state) => {
          let entity = state.entities[action.id]

          delete state.entities[action.id]

          return {
            entities: state.entities,
          }
        },
      },
    }),
})

function useComponentRef<A>(type: ComponentType<A, any>) {
  const ref = React.useRef<ReturnType<ComponentType<A, any>['create']>>()

  return ref
}

export const Logger = () => {
  // const transform = useNewComponent(transformComponent)

  // const [position, rotation, scale] = transform.useStore(d => [d.data.position, d.data.rotation, d.data.scale], shallow)

  return (
    <Entity name="Logger">
      <group position={[-100, 0, 0]}>
        <Component type={transformComponent} args={{}} onChange={v => {}} />
        <Html>
          {logger.useStore().data.logs.map(log => (
            <pre>{log}</pre>
          ))}
        </Html>
      </group>
    </Entity>
  )
}

export const World = ({ children }) => {
  return <>{children}</>
}

const EntityContext = React.createContext<EntityStore | undefined>(undefined)

export const useEntityContext = () => {
  return React.useContext(EntityContext)
}

export const Panel = (props: LevaPanelProps) => {
  return <LevaPanel {...props} />
}

let entityIdCounter = 0

export const Entity = forwardRef(
  (
    { children = null, name = undefined }: { name: string | undefined; children?: React.ReactNode },
    ref: React.ForwardedRef<EntityRef>
  ) => {
    const parent = useEntityContext()
    const id = React.useMemo(() => {
      return entityIdCounter++
    }, [])

    let _entity = React.useMemo(() => {
      const entity = createEntity({ id, name })
      return entity
    }, [id])

    let entity = world.useStore(world => world.data.entities[id]) ?? _entity

    React.useMemo(() => {
      if (entity.getState().data.parent != parent) {
        entity.dispatch({ type: 'SET_PARENT', parent: parent ?? null })
      }
    }, [entity, parent])

    React.useMemo(() => {
      entity.dispatch({ type: 'SET_DATA', data: { name } })
    }, [entity, name])

    React.useMemo(() => {
      world.dispatch({ type: 'ADD_ENTITY', id: id, entity })
    }, [world, entity])

    console.log(
      entity.useStore(s => s.data.name),
      'rendered'
    )

    return (
      <EntityContext.Provider value={entity}>
        <Component type={editorComponent} />
        <EditorPanelComponent />

        {children}
      </EntityContext.Provider>
    )
  }
)

function EntityProxy() {}

function EditorSystem() {
  return (
    <Html></Html>
    // <EntityProxy name="Player">
    //   <Component type={editorComponent} />
    //   <EditorPanelComponent />
    // </EntityProxy>
  )
}

const editorComponent = createComponent({
  name: 'Editor',
  initialData: () => ({
    store: editableStore(),
  }),
})

function useNewComponent<A, Args>(type: ComponentType<A, Args>, args?: Args) {
  const argsRef = React.useRef()
  argsRef.current = args as any

  const component = React.useMemo(() => {
    // @ts-ignore
    return type.create(argsRef.current)
  }, [type])

  return component
}

const Component = forwardRef(function<A>(
  {
    type,
    children,
    args,
    onChange,
  }: {
    onChange?: any
    type: A
    children?: React.ReactNode
    args?: any
  },
  ref: React.ForwardedRef<A>
) {
  const entity = useEntityContext()!
  const argsRef = React.useRef(args)
  const component = React.useMemo(() => {
    if (!entity) {
      return null
    } else {
      let oldComponent = entity.getState().data.components.get(type as any)

      if (oldComponent) {
        // oldComponent.setState({
        //   data:
        //     // @ts-ignore
        //     type.initialData(argsRef.current),
        // })
        return oldComponent
      }

      // @ts-ignore
      let component = type.create(argsRef.current)

      if (ref) {
        // @ts-ignore
        ref.current = component
      }

      return component
    }
  }, [type, entity, ref])

  React.useMemo(() => {
    if (entity) {
      entity.dispatch({ type: 'SET_COMPONENT', componentType: type as any, component: component as any })
    }
  }, [entity])

  React.useLayoutEffect(() => {
    if (onChange) return component.subscribe(onChange)
  }, [onChange])

  // @ts-ignore

  return children ? <>{children}</> : null
})

export function useEditableEntity() {
  const entity = useEntityContext()!
  const component = useEntityComponent(editorComponent, entity)
  const editable = React.useMemo(() => {
    if (component) {
      return component
    }
    const newComponent = editorComponent.create({})

    if (entity) {
      entity.dispatch({ type: 'SET_COMPONENT', componentType: editorComponent as any, component: newComponent as any })
    }

    return newComponent
  }, [entity])
  return editable.useStore(s => s.data.store)
}


function EditorPanelComponent() {
  const store = useEditableEntity()
  const entity = useEntityContext()
  // const {
  //   data: { id, name },
  // } = entity?.useStore()!
  // useControls({ id, name }, { store })
  const ref = React.useRef<THREE.Group>()

  const transform = useEntityComponent(object3DComponent, entity!)

  console.log('TRANSFORM', transform)

  // const object = transform?.useStore(s => s.data.object)

  React.useEffect(() => {
    if (transform) {
      return transform.subscribe(({ object: { object } }) => {
        // console.log(data.position)
        if (ref.current) {
          ref.current.position.x += 0.001
        }
        // console.log(o)
      })
    }
  }, [transform])

  // useFrame(() => {
  // let state = transform?.getState()
  // console.log(state)
  // if (state?.data.object && ref.current) {
  //   ref.current.position.x = state?.data.object.position.x
  // }
  // })
  // const store = component.getState().data.store

  React.useEffect(() => {}, [])

  return (
    <group ref={ref}>
      <Html>
        <Panel store={store} />
      </Html>
    </group>
  )
}

const object3DComponent = createComponent({
  initialData: object => ({ object }),
})

export const useEntityComponent = function<A>(type: ComponentType<A, any>, entity: EntityStore) {
  return entity.useStore(s => s.data.components.get(type as any))
}

const createEntityType = function<T, Props extends Object3DNode<any, any>>(
  Class: any,
  hook: (props: { object: T; store: EditableStore | null; onChange: (e) => {} }) => void
) {
  let entityCount = 0
  const component = forwardRef(function EntityComponent({ ...props }: Props, ref: React.ForwardedRef<T | undefined>) {
    const object = React.useMemo(() => {
      const obj = new Class(...(props.args ?? []))
      applyProps(obj, props, {})
      return obj
    }, [])

    React.useEffect(() => {
      return () => {
        object.dispose?.()
      }
    }, [])

    const store = useEditableEntity() as any
    const entity = useEntityContext()

    const component = useNewComponent(object3DComponent, { object })

    React.useMemo(() => {
      if (entity) {
        entity.dispatch({ type: 'SET_COMPONENT', component, componentType: object3DComponent })
      }
    }, [component, entity])

    hook({
      object,
      store,
      onChange: e => {
        component.setState({})
        // entity?.setState({})
      },
    })
    let element = (
      // @ts-ignore
      <>
        <primitive
          ref={ref}
          //ref={mergeRefs([objectRef, ref])}
          object={object}
          {...props}
        />
        {/* <Component type={object3DComponent} args={{ object }} /> */}
      </>
    )
    return <>{element}</>
  })

  component.displayName = 'Vinxi(' + Component + ')'
  return component
}

const transformControls = (object, onChange) => ({
  position: {
    type: 'VECTOR3D',

    value: [object.position.x, object.position.y, object.position.z],
    onChange: v => {
      object.position.set(...v)
      onChange('position', v)
    },
  },
  scale: {
    type: 'VECTOR3D',
    value: [object.scale.x, object.scale.y, object.scale.z],
    onChange: v => {
      object.scale.set(...v)
      onChange('scale', v)
    },
  },
  rotation: {
    type: 'VECTOR3D',
    value: [object.rotation.x, object.rotation.y, object.rotation.z],
    onChange: v => {
      object.rotation.set(...v)
      onChange('rotation', v)
    },
  },
})

const Group = createEntityType<THREE.Group, GroupProps>(THREE.Group, ({ object, store, onChange }) => {
  // @ts-ignore
  useControls(() => transformControls(object, onChange), store ? { store } : undefined, [])
})
// vinxi.mesh = createEntityType('mesh')
// vinxi.spotLight = createEntityType('spotLight')
// vinxi.directionalLight = createEntityType('directionalLight')
// vinxi.pointLight = createEntityType('pointLight')
// vinxi.perspectiveCamera = createEntityType('perspectiveCamera')
// vinxi.orthographicCamera = createEntityType('orthographicCamera')

const vinxi = {
  group: Group,
}

export default vinxi

// const editorScene = store(
//   {
//     threeScene: null as Scene | null,
//     gl: null,
//     entities: {},
//     entitiesSnapshot: {},
//     initialState: null,
//     sceneSnapshot: null as Scene | null,
//     allowImplicitInstancing: false,
//   },
//   (set, get, api) => {}
// )

// const worldState = createState({
//   threeScene: null as Scene | null,
//   gl: null,
//   entities: {},
//   entitiesSnapshot: {},
//   initialState: null,
//   sceneSnapshot: null as Scene | null,
//   allowImplicitInstancing: false,
// })

// const sceneState = createState({
//   data: {
//     threeScene: null as Scene | null,
//     gl: null,
//     entities: {},
//     entitiesSnapshot: {},
//     initialState: null,
//     sceneSnapshot: null as Scene | null,
//     allowImplicitInstancing: false,
//   },
//   states: {
//     empty: {
//       on: {
//         INIT: [
//           (data, { scene, gl, initialState, allowImplicitInstancing }) => {
//             data.threeScene = scene
//             data.gl = gl

//             data.allowImplicitInstancing = allowImplicitInstancing

//             if (initialState) {
//               data.entities = Object.fromEntries(
//                 Object.entries(initialState.entities).map(([name, entity]) => {
//                   const originalEditable = data.entities[name]
//                   return [
//                     name,
//                     {
//                       type: entity.type,
//                       role: originalEditable?.role ?? 'removed',
//                       // properties: {
//                       //   transform: new Matrix4().fromArray(editable.properties.transform),
//                       // },
//                       // initialProperties: originalEditable?.initialProperties,
//                     },
//                   ]
//                 })
//               )
//             }

//             data.initialState = initialState ?? null
//           },
//           { to: 'active' },
//         ],
//       },
//     },
//     active: {
//       on: {
//         TAKE_SNAPSHOT: data => {
//           data.sceneSnapshot = (data.threeScene?.clone() as Scene) ?? null
//           data.entitiesSnapshot = data.entities
//         },
//       },
//     },
//   },
// })

// export const editorState = createState({
//   data: {
//     allowImplicitInstancing: false,
//     orbitControlsRef: null,
//     editables: {},
//     canvasName: 'default',
//     initialState: null,
//     selected: null,
//     transformControlsMode: 'translate',
//     transformControlsSpace: 'world',
//     viewportShading: 'rendered',
//     editorOpen: false,
//     sceneSnapshot: null,
//     editablesSnapshot: null,
//     hdrPaths: [],
//     selectedHdr: null,
//     showOverlayIcons: false,
//     useHdrAsBackground: true,
//     showGrid: true,
//     showAxes: true,
//   },
//   states: {
//     scene: {
//       states: {},
//     },
//   },
//   states: {
//     idle: {
//       on: {
//         INIT: [
//           (data, { scene, gl, initialState, allowImplicitInstancing }) => {
//             data.scene = scene
//             data.gl = gl

//             if (initialState) {
//               data.editables = Object.fromEntries(
//                 Object.entries(initialState.editables).map(([name, editable]) => {
//                   const originalEditable = data.editables[name]
//                   return [
//                     name,
//                     {
//                       type: editable.type,
//                       role: originalEditable?.role ?? 'removed',
//                       properties: {
//                         transform: new Matrix4().fromArray(editable.properties.transform),
//                       },
//                       initialProperties: originalEditable?.initialProperties ?? {
//                         transform: new Matrix4(),
//                       },
//                     },
//                   ]
//                 })
//               )
//             }

//             data.initialState = initialState ?? null
//           },
//           { to: 'editing' },
//         ],
//       },
//     },
//     editing: {},
//     playing: {},
//   },
// })
