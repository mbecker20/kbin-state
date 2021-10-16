export { default as createStore } from './createStore'
export { default as createStaticStore } from './createStaticStore'
export {
  stringIn,
  roughStringsEqual,
  useReRender,
  genUpdateID,
  filterOutFromObj,
  objFrom2Arrays,
  keepOnlyIdsInObj,
  objectLength,
  mergeNullableIntoUpdate,
  createRootReducer,
  createMidReducer,
  createCreateReducer,
  createDeleteReducer,
  createMultiPushReducer,
  createPushReducer,
  createPullReducer,
  createPullFromAllReducer,
  createMultiPullReducer,
  createUpdateReducer,
  createMergeReducer,
  createReplaceReducer,
  createSingleReducerBundle,
  createDynamicReducer,
} from './helpers'

export const INIT_ACTION = {
  type: 'INIT'
}

export interface Action {
  type: string
  effectData?: any
}

export type Store<RootState> = {
  history: RootState[]
  actionHistory: Action[] // the type of the action fired off. only stores type, and action.effectData
  historyIndex: number
  initialized: boolean
  acknowledged: boolean
  initState: RootState
}

export type StaticStore<RootState> = {
  state: RootState
  initialized: boolean
  acknowledged: boolean
  initState: RootState
}

export type StoreOptions = {
  onUndo?: () => void
  onRedo?: () => void
  log?: boolean
  useLocalStorage?: boolean
  localStorageKey?: string
}

export type StaticStoreOptions = {
  log?: boolean
  useLocalStorage?: boolean
  localStorageKey?: string
}

export type ThunkAction = (dispatch: Dispatch) => Promise<any | void>

export type Reducer<RootState, ReturnState> = (state: RootState, action: any) => ReturnState
export type RootReducer<RootState> = (state?: RootState, action?: Action) => RootState

export interface ReducerBundle<RootState, ReturnState> {
  [key: string]: Reducer<RootState, ReturnState>
}

export type Dispatch = (action: Action) => void

export type Selector<RootState, Return> = (state: RootState) => Return

export type DispatchEvent<RootState> = {
  prevState: RootState,
  nextState: RootState,
}

export type Initializer<RootState> = (initState: RootState, force: boolean) => Promise<RootState>

/* an Effect - used to manage backend */
export type Effect<RootState> = {
  undo?: (oldState: RootState, effectData: any) => void,
  redo?: (newState: RootState, effectData: any, firstTime?: boolean) => void,
  both?: (state: RootState, effectData: any) => void // some actions have symmetric undo / redo
}

export interface Effects<RootState> {
  [index: string]: Effect<RootState>
}

export interface StaticEffects<RootState> {
  [index: string]: (state: RootState, action: any) => void
}

export type DynamicReducerConfig = {
  replace?: [toReplaceIDActionKey: string, toReplaceActionKey: string]
  create?: [toCreateIDActionKey: string, toCreateActionKey: string]
  delete?: [toDeleteIDActionKey: string]
  idActionKey?: string
  update?: [propsToUpdate: string[], propsToUpdateActionKeys: string[]]
  push?: [arrayProp: string, toPushActionKey: string]
  pull?: [arrayProp: string, toPullActionKey: string]
  multiPush?: [arrayProps: string[], toPushActionKeys: string[]]
  multiPull?: [arrayProps: string[], toPullActionKeys: string[]]
  merge?: [toMergeActionKey: string]
}