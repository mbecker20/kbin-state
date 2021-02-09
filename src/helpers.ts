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

export function genUpdateID(updates: number) {
  return `${updates}${Math.floor(Math.random() * 0xFFF).toString(16)}`
}

export function keepOnlyIdsInObj<ObjType>(obj: ObjType, idsToKeep: string[]) {
  return Object.fromEntries(Object.entries(obj).filter(entry => {
    return stringIn(entry[0], idsToKeep)
  }))
}

export function objectLength(obj: any) {
  return Object.keys(obj).length
}

export function mergeNullableIntoUpdate(nullableProps: any) {
  const propsToMerge = Object.keys(nullableProps).filter(prop => {
    return nullableProps[prop] ? true : false
  }).map(prop => {
    return {
      [prop]: nullableProps[prop]
    }
  })
  return Object.assign({}, ...propsToMerge)
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

/**
 * 
 * @param subKey the key of the root field the reducer returns
 * @param propsToUpdate the keys of the fields to update
 * @param toUpdateIDActionKey the key in given action containing the id the update
 * @param propsToUpdateActionKeys the keys in given action containing the updated props. order corresponds to propsToUpdate
 */
export function createUpdateReducer<RootState, SubState>(
  subKey: string, propsToUpdate: string[], toUpdateIDActionKey: string, propsToUpdateActionKeys: string[]
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    const update = objFrom2Arrays(propsToUpdate, propsToUpdate.map((prop, i) => action[propsToUpdateActionKeys[i]]))
    return {
      ...state[subKey],
      [action[toUpdateIDActionKey]]: {
        ...state[subKey][action[toUpdateIDActionKey]],
        ...update
      }
    }
  }
}

/**
 * @param subKey the key of the root field the reducer returns
 * @param toDeleteIDActionKey the key in given action containing the id to delete
 * @returns the delete reducer
 */
export function createDeleteReducer<RootState, SubState>(
  subKey: string, toDeleteIDActionKey: string
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    return filterOutFromObj(state[subKey], [action[toDeleteIDActionKey]]) as SubState
  }
}

/**
 * note that the same action can have multiple push reducers required for different subkeys
 * the id to push to must be given in the action, keyed at toPushIDActionKey
 * the item to push must be given in the action, keyed at toPushActionKey
 * @param subKey the key of the root field the reducer returns
 * @param arrayProp the key of the array of the reducer return object type to push to
 * @param toPushIDActionKey the key of the id to push to. given by the action (id = action[toPushIDActionKey])
 * @param toPushActionKey to key of whatever is being pushed. given by the action (toPush = action[toPushActionKey]) 
 */
export function createPushReducer<RootState, SubState>(
  subKey: string, arrayProp: string, toPushIDActionKey: string, toPushActionKey: string
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    return {
      ...state[subKey],
      [action[toPushIDActionKey]]: {
        ...state[subKey][action[toPushIDActionKey]],
        [arrayProp]: [...state[subKey][action[toPushIDActionKey]][arrayProp], action[toPushActionKey]]
      }
    } as SubState
  }
}

/**
 * note that the same action can have multiple push reducers required for different subkeys
 * the id to push to must be given in the action, keyed at toPushIDActionKey
 * the items to push must be given in the action, with keys in toPushActionKeys in the same order
 * as the props to push to given in arrayProps
 * @param subKey the key of the root field the reducer returns
 * @param arrayProps the keys of the arrays of the reducer return object type to push to
 * @param toPushIDActionKey the key of the id to push to. given by the action (id = action[toPushIDActionKey])
 * @param toPushActionKey to key of whatever is being pushed. given by the action (toPush = action[toPushActionKey])
 * @returns the multi push reducer
 */
export function createMultiPushReducer<RootState, SubState>(
  subKey: string, arrayProps: string[], toPushIDActionKey: string, toPushActionKeys: string[]
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    const update = objFrom2Arrays(
      arrayProps, arrayProps.map((arrayProp, i) => (
        [...state[subKey][action[toPushIDActionKey]][arrayProp], action[toPushActionKeys[i]]]
      ))
    )
    return {
      ...state[subKey],
      [action[toPushIDActionKey]]: {
        ...state[subKey][action[toPushIDActionKey]],
        ...update
      }
    } as SubState
  }
}

/**
 * returns a create reducer
 * @param subKey the key of the root field the reducer returns
 * @param toCreateIDActionKey the key of given action containing the id to create
 * @param toCreateActionKey the key of given action containing the object to create at id
 * @returns the create reducer
 */
export function createCreateReducer<RootState, SubState>(
  subKey: string, toCreateIDActionKey: string, toCreateActionKey: string
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    return { ...state[subKey], [action[toCreateIDActionKey]]: action[toCreateActionKey] }
  }
}