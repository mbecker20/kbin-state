import { filterOutFromObj, objFrom2Arrays } from "../state/helpers";
import { INIT_ACTION } from "./createStore";
import { ReducerBundle, RootReducer, Reducer, Action } from "./types";

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