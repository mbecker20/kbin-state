import { useState } from "react";
import { INIT_ACTION } from "./index";
import { ReducerBundle, RootReducer, Reducer, Action } from "./index";

export function useReRender() {
  const [, toReRender] = useState('')
  let count = 0
  const reRender = () => {
    toReRender(genUpdateID(count))
    count++
  }
  return reRender
}

function genUpdateID(updates: number) {
  return `${updates}${Math.floor(Math.random() * 0xFFF).toString(16)}`
}

export function createRootReducer<RootState>(
  initState: RootState,
  reducerBundle: ReducerBundle<RootState, any>
): RootReducer<RootState> {
  const keys = Object.keys(reducerBundle)
  return function rootReducer(
    state = initState, 
    action = INIT_ACTION
  ) {
    const subStates = keys.map(key => reducerBundle[key](state, action))
    return objFrom2Arrays(keys, subStates) as RootState
  }
}

export function filterOutFromObj<ObjType>(obj: ObjType, idsToFilterOut: string[]) {
  return Object.fromEntries(Object.entries(obj).filter(entry => {
    return !stringIn(entry[0], idsToFilterOut)
  }))
}

export function stringIn(str: string, ar: any[]) {
  return ar.includes(str)
}

export function objFrom2Arrays(keys: string[], entries: any[]) {
  if (keys.length === entries.length) {
    return Object.fromEntries(keys.map((id, index) => {
      return [id, entries[index]]
    }))
  }
  return {}
}

export function createMidReducer<RootState, SubState>(
  key: string, reducerBundle: ReducerBundle<RootState, SubState>
): Reducer<RootState, SubState> {
  const keys = Object.keys(reducerBundle)
  return (state: RootState, action: Action) => {
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === action.type) {
        return reducerBundle[keys[i]](state, action)
      }
    }
    return (state as any)[key]
  }
}

export function createUpdateReducer<RootState, SubState>(
  subKey: string, props: string[], // update action must have id, and data at same key as in state
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    const update = objFrom2Arrays(props, props.map(prop => action[prop]))
    return {
      ...state[subKey],
      [action.id]: {
        ...state[subKey][action.id],
        ...update
      }
    }
  }
}

export function createDeleteReducer<RootState, SubState>(
  subKey: string
): Reducer<RootState, SubState> {
  return (state: any, { id }: any) => {
    return filterOutFromObj(state[subKey], [id]) as SubState
  }
}

export function createPushReducer<RootState, SubState>(
  subKey: string, arrayProp: string
): Reducer<RootState, SubState> {
  return (state: any, { pushIDs, toPush }: any) => {
    return {
      ...state[subKey],
      [pushIDs[subKey]]: {
        ...state[subKey][pushIDs[subKey]],
        [arrayProp]: [...state[subKey][pushIDs[subKey]][arrayProp], toPush[subKey]]
      }
    } as SubState
  }
}

export function createMultiPushReducer<RootState, SubState>(
  subKey: string, arrayProps: string[]
): Reducer<RootState, SubState> {
  return (state: any, { pushID, toPushObj }: any) => {
    const update = objFrom2Arrays(
      arrayProps, arrayProps.map(arrayProp => [...state[subKey][pushID][arrayProp], toPushObj[arrayProp]])
    )
    return {
      ...state[subKey],
      [pushID]: {
        ...state[subKey][pushID],
        ...update
      }
    } as SubState
  }
}

export function createCreateReducer<RootState, SubState>(
  subKey: string
): Reducer<RootState, SubState> {
  return (state: any, { toCreate }: any) => {
    return { ...state[subKey], [toCreate._id]: toCreate }
  }
}