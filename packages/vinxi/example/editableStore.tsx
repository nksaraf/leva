import create, { GetState, SetState, State, StoreApi, UseStore } from 'zustand'
import { combine } from 'zustand/middleware'
import { Data, FolderSettings, SpecialInputTypes, StoreType } from 'leva'
import { join, LevaErrors, normalizeInput, warn } from 'leva'
import { Store } from '../src/leva'

export const createStore = <PrimaryState extends State, SecondaryState extends State>(
  initialState: PrimaryState,
  creator: (set: SetState<PrimaryState>, get: GetState<PrimaryState>, api: StoreApi<PrimaryState>) => SecondaryState
) => {
  const store = create(combine(initialState, creator))
  return store
}

export interface EditableStore<TState extends State & { data: {} } = { data: {} }>
  extends StoreType<TState>,
    UseStore<TState> {}

export function editableStore<T>(): // <PrimaryState extends State & { data: {} }, SecondaryState extends State>(
//   initialState: PrimaryState,
//   creator: (set: SetState<PrimaryState>, get: GetState<PrimaryState>, api: StoreApi<PrimaryState>) => SecondaryState
EditableStore<any> {
  const store = new Store()
  return store
}
