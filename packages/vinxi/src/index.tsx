import 'twind/shim'
import React from 'react'
import { render } from 'react-dom'
import Editor from './components/Editor'
export { default as editable } from './entity'
export { configure } from './store'

if (process.env.NODE_ENV === 'development') {
  const editorRoot = document.createElement('div')
  document.body.appendChild(editorRoot)
  render(<Editor />, editorRoot)
}
