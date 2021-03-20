import React from 'react'
import { Canvas } from 'react-three-fiber'
// import { editable as e, configure } from '../src'
import { PerspectiveCamera } from '@react-three/drei'
import { GLTFExporter } from 'three-stdlib'
import { useCreateStore } from 'leva'
// const bind = configure()
const ECamera = e(PerspectiveCamera, 'perspectiveCamera')

const reducer = () => {}

const EntityContext = React.useContext()
const useEntity = () => {
  return useContext(EntityContext)
}

const Entity = () => {
  const store = useCreateStore()

  return <EntityContext.Provider store={store}>{children}</EntityContext.Provider>
}

const SpotLightComponent = ({}) => {
  return <e.spotLight uniqueName="Key Light" shadow-mapSize-width={2048} shadow-mapSize-height={2048} castShadow />
}

const TransformComponent = () => {
  return null
}

const SpotLight = () => {
  const ref = () => {}

  return (
    <Entity>
      <SpotLightComponent />
    </Entity>
  )
}

function Wizard() {
  return <Entity></Entity>
}

function MainPlayer() {
  return <Entity></Entity>
}

function Game() {
  return (
    <Canvas
      shadowMap
      className="v-full h-full"
      onCreated={(options) => {
        console.log(new GLTFExporter().parse(options.scene, console.log), options.scene, options.scene.toJSON())
        bind({})(options)
      }}>
      {children}
    </Canvas>
  )
}

function App() {
  return (
    <Game>
      {/* <PointLight />
      <MainPlayer />
      <Entity name="ground">
        <e.mesh receiveShadow>
          <planeBufferGeometry />
          <meshStandardMaterial color="lightblue" />
        </e.mesh>
      </Entity>
      <Ball /> */}
      <e.spotLight uniqueName="Key Light" shadow-mapSize-width={2048} shadow-mapSize-height={2048} castShadow />
      <e.spotLight uniqueName="Fill Light" shadow-mapSize-width={2048} shadow-mapSize-height={2048} castShadow />
      <fog />
    </Game>
  )
}

function IceCream() {
  return (
    <Entity>
      <e.group uniqueName="Ice Cream">
        <e.mesh uniqueName="Cone" castShadow>
          <coneBufferGeometry />
          <meshStandardMaterial color="orange" />
        </e.mesh>
        <e.mesh uniqueName="Scoop 1" castShadow>
          <sphereBufferGeometry />
          <meshStandardMaterial color="red" />
        </e.mesh>
        <e.mesh uniqueName="Scoop 2" castShadow>
          <sphereBufferGeometry />
          <meshStandardMaterial color="green" />
        </e.mesh>
        <e.mesh uniqueName="Scoop 3" castShadow>
          <sphereBufferGeometry />
          <meshStandardMaterial color="blue" />
        </e.mesh>
      </e.group>
    </Entity>
  )
}

export default App
