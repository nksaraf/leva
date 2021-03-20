import React from 'react'
import { transition } from './states'
import { forwardRef } from 'react'
import { DirectionalLight, Group, Mesh, OrthographicCamera, PerspectiveCamera, PointLight, SpotLight } from 'three'
import mergeRefs from 'react-merge-refs'
import { useControls, LevaPanel } from '../src/leva'
import { createStore, editableStore, EditableStore } from './editableStore'
import { GetState, SetState, StoreApi } from 'zustand'
import { Html } from '@react-three/drei'
import { LevaPanelProps } from '../src/leva/components/Leva'

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

interface EntityStore
  extends MachineStore<
    'ALIVE' | 'DEAD',
    | {
        type: 'DESTROY'
      }
    | { type: 'SET_WORLD'; worldRef: any }
    | { type: 'SET_PARENT'; parent: EntityStore | null }
    | { type: 'CREATE_COMPONENT'; componentType: ComponentType<{}, any>; args: any }
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
  name,
  id,
  parent = null as null | EntityStore,
  worldRef = null as null | any,
  // @ts-ignore
  // worldRefany,
}): EntityStore => {
  return machine({
    initialState: 'ALIVE' as 'ALIVE' | 'DEAD',
    data: {
      id,
      type: '',
      name,
      worldRef: null as any,
      parent: parent as null | EntityStore,
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
            console.log(action.componentType, action.component)
            state.components.set(action.componentType, action.component)
            return { components: state.components }
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

const transformComponent = createComponent({
  data: {
    position: [0, 0, 0],
    scale: [0, 0, 0],
    rotation: [0, 0, 0],
  },
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

export const World = ({ children }) => {
  return <>{children}</>
}

const EntityContext = React.createContext<EntityStore | undefined>(undefined)

export const useEntityContext = () => {
  return React.useContext(EntityContext)
}

const getId = ({ id, name }) => {
  return id ?? name
}

export const Panel = (props: LevaPanelProps) => {
  return <LevaPanel {...props} />
}

export const Entity = ({
  children = null as React.ReactNode,
  name = undefined as string | undefined,
  id = undefined as string | undefined,
}) => {
  const parent = useEntityContext()
  const entity = React.useMemo(() => {
    const i = getId({ id, name })
    console.log(i)
    let oldEntity = world.getState().data.entities[i]
    if (oldEntity) {
      return oldEntity
    } else {
      const entity = createEntity({ id: i, name: i })
      world.dispatch({ type: 'ADD_ENTITY', id: i, entity })
      return entity
    }
  }, [id, name])

  React.useMemo(() => {
    entity.dispatch({ type: 'SET_PARENT', parent: parent ?? null })
  }, [entity, parent])

  return (
    <EntityContext.Provider value={entity}>
      <Component type={editorComponent} />
      <EditorPanelComponent />
      {children}
    </EntityContext.Provider>
  )
}

const editorComponent = createComponent({
  name: 'Editor',
  initialData: () => ({
    store: editableStore(),
  }),
})

function Component({ type, children, args }: { type: any; children?: React.ReactNode; args?: any }) {
  const entity = useEntityContext()!
  const argsRef = React.useRef(args)
  React.useMemo(() => {
    if (!entity) {
      return null
    } else {
      let oldComponent = entity.getState().data.components.get(type as any)

      if (oldComponent) {
        return oldComponent
      }

      const component = type.create(argsRef.current)
      entity.dispatch({ type: 'SET_COMPONENT', componentType: type as any, component })

      return null
    }
    // } else {
    //   const component = componentType(argsRef.current)
    //   return component
    // }
  }, [type, entity])

  return children ? <>{children}</> : null
}

export function useEntityEditorStore() {
  const entity = useEntityContext()!
  const component = useEntityComponent(editorComponent, entity)
  return component.useStore(s => s.data.store)
}

function EditorPanelComponent() {
  const store = useEntityEditorStore()
  const entity = useEntityContext()
  const {
    data: { id, name },
  } = entity?.useStore()
  useControls({ id, name }, { store })
  // const store = component.getState().data.store
  return (
    <Html position={[20, 20, 20]}>
      <Panel store={store} />
    </Html>
  )
}

export const useEntityComponent = function<A>(type: ComponentType<A, any>, entity: EntityStore) {
  // const argsRef = React.useRef(args)
  // argsRef.current = args
  const state = entity.useStore(s => s.data.components)
  console.log(state)
  return React.useMemo(() => {
    console.log(entity, type)
    if (!entity) {
      return null
    } else {
      let oldComponent = entity.getState().data.components.get(type as any)
      console.log(entity, type, entity.getState(), oldComponent)

      if (oldComponent) {
        return oldComponent
      }

      // const component = componentType(argsRef.current)
      // entity.dispatch({ type: 'SET_COMPONENT', componentType, component })

      return null
    }
    // } else {
    //   const component = componentType(argsRef.current)
    //   return component
    // }
  }, [type, entity]) as ReturnType<ComponentType<A, any>['create']>
}

interface Elements {
  group: Group
  mesh: Mesh
  spotLight: SpotLight
  directionalLight: DirectionalLight
  perspectiveCamera: PerspectiveCamera
  orthographicCamera: OrthographicCamera
  pointLight: PointLight
}

// export const component = () => {
//   const func = () => {
//     return null
//   }

//   return func
// }

// const PositionComponent = component(() => {})

// const entity = <T extends JSXElementConstructor<any>, U extends any>(Component: T, type: U) =>
//   forwardRef(
//     (
//       {
//         uniqueName,
//         position,
//         rotation,
//         scale,
//         userData,
//         ...props
//       }: ComponentProps<T> & {
//         id: string
//       } & RefAttributes<Elements[U]>,
//       ref
//     ) => {
//       const objectRef = useRef<Elements[U]>()

//       const [addEntity, removeEntity] = useWorldStore(state => [state.addEditable, state.removeEditable], shallow)

//       useLayoutEffect(() => {
//         addEntity(type, uniqueName, {})

//         return () => {
//           removeEntity(uniqueName)
//         }
//       }, [
//         addEntity,
//         removeEntity,
//         uniqueName,

//         // nasty
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//       ])

//       useLayoutEffect(() => {
//         const object = objectRef.current!
//         // source of truth is .position, .quaternion and .scale, not the matrix, so we have to do store instead of setting the matrix
//         useWorldStore
//           .getState()
//           .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)

//         const unsub = useWorldStore.subscribe(
//           (transform: Matrix4 | null) => {
//             if (transform) {
//               useWorldStore
//                 .getState()
//                 .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)
//             }
//           },
//           state => state.editables[uniqueName].properties.transform
//         )

//         return () => {
//           unsub()
//         }
//       }, [uniqueName])

//       return (
//         // @ts-ignore
//         <Component
//           ref={mergeRefs([objectRef, ref])}
//           {...props}
//           userData={{
//             __editable: true,
//             __editableName: uniqueName,
//             __editableType: type,
//           }}
//         />
//       )
//     }
//   )

const createEntityType = function<T>(Component: T) {
  let entityCount = 0
  const component = forwardRef(function EntityComponent(props, ref) {
    const objectRef = React.useRef()
    let element = (
      // @ts-ignore
      <Component
        ref={mergeRefs([objectRef, ref])}
        {...props}
        userData={{
          __editable: true,
          // __editableName: uniqueName,
          // __editableType: type,
        }}
      />
    )
    return <Entity name={`${Component}${entityCount++}`}>{element}</Entity>
  })

  component.displayName = 'Vinxi(' + Component + ')'
  return component
}
const vinxi: any = {}

vinxi.group = createEntityType('group')
vinxi.mesh = createEntityType('mesh')
vinxi.spotLight = createEntityType('spotLight')
vinxi.directionalLight = createEntityType('directionalLight')
vinxi.pointLight = createEntityType('pointLight')
vinxi.perspectiveCamera = createEntityType('perspectiveCamera')
vinxi.orthographicCamera = createEntityType('orthographicCamera')

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
