import React from 'react'
import ReactDOM from 'react-dom'

import { Canvas } from 'react-three-fiber'
import { useControls } from 'leva'
import { configure, editable as e } from '../src'
const bind = configure({
  localStorageNamespace: 'MyProject',
})
const MyComponent = () => {
  const { a } = useControls({ a: 1 })
  return (
    <Canvas onCreated={bind()}>
      <e.mesh uniqueName="My First Editable Object">
        <sphereBufferGeometry />
        <meshStandardMaterial color="rebeccapurple" />
      </e.mesh>
    </Canvas>
  )
}

import './index.css'

const rootElement = document.getElementById('root')
ReactDOM.render(
  <React.StrictMode>
    <MyComponent />
  </React.StrictMode>,
  rootElement
)
