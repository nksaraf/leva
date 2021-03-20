import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'

import { Canvas, useResource, useFrame } from 'react-three-fiber'
import { folder, useControls } from '../src/leva'
import { OrbitControls, PerspectiveCamera, useHelper } from '@react-three/drei'
// import { configure, editable as e } from './'
import v, { Entity, useEntityContext, useEntityEditorStore, world, World } from './world'

world.getState().dispatch({ type: 'CREATE_ENTITY', id: 1 })
// const bind = configure({
//   localStorageNamespace: 'MyProject',
// })

const MyComponent = () => {
  // const { a } = useControls({ a: 1 })
  const ref = useResource<THREE.Camera>()

  return (
    <World>
      <Canvas gl={{ antialias: true, alpha: true }} shadowMap>
        <fog />
        <PerspectiveCamera
          ref={ref}
          makeDefault
          position={[0, 100, 200]}
          fov={80}
          near={1}
          far={100000}
          aspect={window.innerWidth / window.innerHeight}
        />
        <OrbitControls camera={ref.current} />
        <hemisphereLight args={[0xaaaaaa, 0x000000, 0.9]} />
        <directionalLight
          args={[0xffffff, 0.9]}
          position={[150, 350, 350]}
          castShadow
          name="Dire"
          // uniqueName="Dire"
          // shadow={}
        ></directionalLight>

        <Entity name={'sea'}>
          <Sea />
        </Entity>
        <Airplane />
        <Sky clouds={[1, 2, 3, 4, 5, 6]} position={[0, -600, 0]} />
      </Canvas>
    </World>
  )
}

var Colors = {
  red: 0xf25346,
  white: 0xd8d0d1,
  brown: 0x59332e,
  pink: 0xf5986e,
  brownDark: 0x23190f,
  blue: 0x68c3c0,
}
function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin)
  var dv = vmax - vmin
  var pc = (nv - vmin) / dv
  var dt = tmax - tmin
  var tv = tmin + pc * dt
  return tv
}
function Airplane() {
  // const controls = useControls({
  //   speed: { value: 0.1, min: 0, max: 10 },
  // })
  const ref = useRef<THREE.Mesh>()
  useFrame(() => {
    // ref.current.rotation.x += controls.speed
    ref.current.rotation.x += 0.1
  })

  const mousePos = React.useRef({ x: 0, y: 0 })
  useEventListener('mousemove', event => {
    var tx = -1 + (event.clientX / window.innerWidth) * 2
    var ty = 1 - (event.clientY / window.innerHeight) * 2
    mousePos.current = { x: tx, y: ty }
  })

  const planeRef = React.useRef<THREE.Mesh>()
  useFrame(() => {
    var targetX = normalize(mousePos.current.x, -1, 1, -100, 100)
    var targetY = normalize(mousePos.current.y, -1, 1, 25, 175)
    planeRef.current.position.x = targetX
    planeRef.current.position.y = targetY
  })

  return (
    <Entity name={'Player'}>
      <group ref={planeRef} scale={[0.25, 0.25, 0.25]} position={[0, 100, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[60, 50, 50, 1, 1, 1]} />
          <meshPhongMaterial color={Colors.red} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[40, 0, 0]}>
          <boxGeometry args={[20, 50, 50, 1, 1, 1]} />
          <meshPhongMaterial color={Colors.white} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[-35, 25, 0]}>
          <boxGeometry args={[15, 20, 5, 1, 1, 1]} />
          <meshPhongMaterial color={Colors.red} flatShading />
        </mesh>
        <mesh ref={ref} castShadow receiveShadow position={[50, 0, 0]}>
          <boxGeometry args={[20, 10, 10, 1, 1, 1]} />
          <meshPhongMaterial color={Colors.brown} flatShading />
          <mesh position={[8, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, 100, 20, 1, 1, 1]} />
            <meshPhongMaterial color={Colors.brownDark} flatShading />
          </mesh>
        </mesh>
      </group>
    </Entity>
  )
}

// Hook
function useEventListener(eventName, handler, element = window, options = {} as AddEventListenerOptions) {
  // Create a ref that stores handler
  const savedHandler = useRef<any>()

  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(
    () => {
      // Make sure element supports addEventListener
      // On
      const isSupported = element && element.addEventListener
      if (!isSupported) return

      // Create event listener that calls handler function stored in ref
      const eventListener = event => savedHandler.current?.(event)

      // Add event listener
      element.addEventListener(eventName, eventListener, options)

      // Remove event listener on cleanup
      return () => {
        element.removeEventListener(eventName, eventListener, options)
      }
    },
    [eventName, element] // Re-run if eventName or element changes
  )
}

function Cloud(props) {
  const scale = React.useMemo(() => 0.1 + Math.random() * 0.9, [])
  const nBlocks = React.useMemo(() => {
    return 3 + Math.floor(Math.random() * 3)
  }, [])

  var indents = []
  for (var i = 0; i < nBlocks; i++) {
    indents.push(
      <mesh
        castShadow
        receiveShadow
        key={i}
        position={[i * 15, Math.random() * 10, Math.random() * 10]}
        rotation={[0, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]}>
        <boxGeometry args={[20, 20, 20]} />
        <meshPhongMaterial color={Colors.white} />
        {/* <primitive object={geom} attach="geometry" />
        <primitive object={material} attach="material" /> */}
      </mesh>
    )
  }

  // useHelper(Helper)
  return (
    <group {...props}>
      {indents}
      {/* <boxGeometry args={[20, 20, 20]} /> */}
      {/* <meshPhongMaterial color={Colors.white} /> */}
      {/* {Array.from(new Arra())} */}
    </group>
  )
}

function Sky({ clouds, ...props }) {
  // const controls = useControls({
  //   sky: folder({
  //     speed: { value: 0.01, min: 0, max: 2, step: 0.001 },
  //   }),
  // })
  const ref = useRef<THREE.Mesh>()
  useFrame(() => {
    // ref.current.rotation.x += controls.speed
    ref.current.rotation.z += 0.01
  })

  var stepAngle = (Math.PI * 2) / clouds.length

  const seed = React.useMemo(() => Math.random(), [])
  return (
    <group {...props} ref={ref}>
      {clouds.map((item, i) => {
        // var c = new Cloud()

        // set the rotation and the position of each cloud;
        // for that we use a bit of trigonometry
        var a = stepAngle * i // this is the final angle of the cloud
        var h = 750 + seed * 200 // this is the distance between the center of the axis and the cloud itself
        // Trigonometry!!! I hope you remember what you've learned in Math :)
        // in case you don't:
        // we are simply converting polar coordinates (angle, distance) into Cartesian coordinates (x, y)
        // c.mesh.position.y = Math.sin(a) * h
        // c.mesh.position.x = Math.cos(a) * h

        // // rotate the cloud according to its position
        // c.mesh.rotation.z = a + Math.PI / 2

        // // for a better result, we position the clouds
        // // at random depths inside of the scene
        // c.mesh.position.z = -400 - Math.random() * 400

        // we also set a random scale for each cloud
        // var s = 1 + Math.random() * 2
        var s = 1 + seed * 2

        return (
          <Cloud
            key={i}
            // rotation={[0, 0, a + Math.PI / 2]}
            position={[Math.cos(a) * h, Math.sin(a) * h, -400 - seed * 400]}
            scale={[s, s, s]}
          />
        )
      })}
    </group>
  )
}

function Sea(props) {
  const store = useEntityEditorStore()
  const controls = useControls(
    'movement',
    {
      speed: { value: 0.01, min: 0, max: 10 },
    },
    { store: store }
  )
  const ref = useRef<THREE.Mesh>()
  useFrame(() => {
    ref.current.rotation.y -= controls.speed
    // ref.current.rotation.z += 0.005
  })
  return (
    <mesh
      ref={ref}
      receiveShadow
      position={[0, -600, 0]}
      // {...props}
      rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[600, 600, 800, 40, 10]} />
      <meshPhongMaterial args={[{ color: Colors.blue, transparent: true, opacity: 0.6, flatShading: true }]} />
    </mesh>
  )
}

import './index.css'
import { HemisphereLight } from 'three'

const rootElement = document.getElementById('root')
ReactDOM.render(
  <React.StrictMode>
    <MyComponent />
  </React.StrictMode>,
  rootElement
)
