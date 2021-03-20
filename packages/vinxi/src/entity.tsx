import React, { ComponentProps, forwardRef, JSXElementConstructor, RefAttributes, useLayoutEffect, useRef } from 'react'
import {
  DirectionalLight,
  Euler,
  Group,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  SpotLight,
  Vector3,
} from 'three'
import { EditableType, useGameStore as useWorldStore } from './store'
import shallow from 'zustand/shallow'
import mergeRefs from 'react-merge-refs'
import { folder, useControls, useCreateStore } from 'leva'
import { Store } from 'leva'

interface Elements {
  group: Group
  mesh: Mesh
  spotLight: SpotLight
  directionalLight: DirectionalLight
  perspectiveCamera: PerspectiveCamera
  orthographicCamera: OrthographicCamera
  pointLight: PointLight
}

const entitiesStore = new Store()

const EntityContext = React.createContext({})
const useEntity = () => {
  return React.useContext(EntityContext)
}

const Entity = ({ children, id }) => {
  const store = useCreateStore()

  useControls(
    {
      entities: folder({
        id: true,
      }),
    },
    { store: entitiesStore }
  )
  return <EntityContext.Provider value={store}>{children}</EntityContext.Provider>
}

const Component = () => {
  useControls({})
}

const component = () => {
  const func = () => {
    return null
  }

  return func
}

// const PositionComponent = component(() => {})

const entity = <T extends JSXElementConstructor<any> | EditableType, U extends EditableType>(Component: T, type: U) =>
  forwardRef(
    (
      {
        uniqueName,
        position,
        rotation,
        scale,
        userData,
        ...props
      }: ComponentProps<T> & {
        id: string
      } & RefAttributes<Elements[U]>,
      ref
    ) => {
      const objectRef = useRef<Elements[U]>()

      const [addEntity, removeEntity] = useWorldStore(state => [state.addEditable, state.removeEditable], shallow)

      useLayoutEffect(() => {
        addEntity(type, uniqueName, {})

        return () => {
          removeEntity(uniqueName)
        }
      }, [
        addEntity,
        removeEntity,
        uniqueName,

        // nasty
        // eslint-disable-next-line react-hooks/exhaustive-deps
      ])

      useLayoutEffect(() => {
        const object = objectRef.current!
        // source of truth is .position, .quaternion and .scale, not the matrix, so we have to do this instead of setting the matrix
        useWorldStore
          .getState()
          .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)

        const unsub = useWorldStore.subscribe(
          (transform: Matrix4 | null) => {
            if (transform) {
              useWorldStore
                .getState()
                .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)
            }
          },
          state => state.editables[uniqueName].properties.transform
        )

        return () => {
          unsub()
        }
      }, [uniqueName])

      return (
        // @ts-ignore
        <Component
          ref={mergeRefs([objectRef, ref])}
          {...props}
          userData={{
            __editable: true,
            __editableName: uniqueName,
            __editableType: type,
          }}
        />
      )
    }
  )

const createEntity = <T extends EditableType>(type: T) => entity(type, type)

entity.group = createEntity('group')
entity.mesh = createEntity('mesh')
entity.spotLight = createEntity('spotLight')
entity.directionalLight = createEntity('directionalLight')
entity.pointLight = createEntity('pointLight')
entity.perspectiveCamera = createEntity('perspectiveCamera')
entity.orthographicCamera = createEntity('orthographicCamera')

export default entity
