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
import { EditableType, useGameStore } from './store'
import shallow from 'zustand/shallow'
import mergeRefs from 'react-merge-refs'

interface Elements {
  group: Group
  mesh: Mesh
  spotLight: SpotLight
  directionalLight: DirectionalLight
  perspectiveCamera: PerspectiveCamera
  orthographicCamera: OrthographicCamera
  pointLight: PointLight
}

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

      console.log(props)

      const [addEditable, removeEditable] = useGameStore((state) => [state.addEditable, state.removeEditable], shallow)

      const transformDeps: string[] = []

      ;['x', 'y', 'z'].forEach((axis) => {
        transformDeps.push(props[`position-${axis}`], props[`rotation-${axis}`], props[`scale-${axis}`])
      })

      useLayoutEffect(() => {
        // calculate initial properties before adding the editable
        const pos: Vector3 = position ? new Vector3(...position) : new Vector3()
        const rot: Vector3 = rotation ? new Vector3(...rotation) : new Vector3()
        const scal: Vector3 = scale ? new Vector3(...scale) : new Vector3(1, 1, 1)

        ;['x', 'y', 'z'].forEach((axis, index) => {
          if (props[`position-${axis}`]) pos.setComponent(index, props[`position-${axis}`])
          if (props[`rotation-${axis}`]) rot.setComponent(index, props[`rotation-${axis}`])
          if (props[`scale-${axis}`]) scal.setComponent(index, props[`scale-${axis}`])
        })

        const quaternion = new Quaternion().setFromEuler(new Euler().setFromVector3(rot))

        addEditable(type, uniqueName, {
          transform: new Matrix4().compose(pos, quaternion, scal),
        })

        return () => {
          removeEditable(uniqueName)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [
        addEditable,
        position,
        removeEditable,
        rotation,
        scale,
        uniqueName,

        // nasty
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ...transformDeps,
      ])

      useLayoutEffect(() => {
        const object = objectRef.current!
        // source of truth is .position, .quaternion and .scale, not the matrix, so we have to do this instead of setting the matrix
        useGameStore
          .getState()
          .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)

        const unsub = useGameStore.subscribe(
          (transform: Matrix4 | null) => {
            if (transform) {
              useGameStore
                .getState()
                .editables[uniqueName].properties.transform.decompose(object.position, object.quaternion, object.scale)
            }
          },
          (state) => state.editables[uniqueName].properties.transform
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

const createEditable = <T extends EditableType>(type: T) => entity(type, type)

entity.group = createEditable('group')
entity.mesh = createEditable('mesh')
entity.spotLight = createEditable('spotLight')
entity.directionalLight = createEditable('directionalLight')
entity.pointLight = createEditable('pointLight')
entity.perspectiveCamera = createEditable('perspectiveCamera')
entity.orthographicCamera = createEditable('orthographicCamera')

export default entity
