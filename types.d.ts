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
}

export type StaticStore<RootState> = {
  state: RootState
  initialized: boolean
  acknowledged: boolean
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
  [index: string]: (state: RootState, effectData: any) => void
}