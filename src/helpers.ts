import { useState } from "react";
import { DynamicReducerConfig, INIT_ACTION } from "./index";
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

export function arrToKeyedObject<T>(arr: any[], keyField: string): { [key: string]: T } {
  return Object.fromEntries(arr.map(obj => [obj[keyField], obj]))
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

/**
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
 * 
 * @param subKey the key of the root field the reducer returns
 * @param arrayProp the key of the array of the reducer return object type to pull from
 * @param toPullIDActionKey the key of the id to pull from. given by the action (id = action[toPullIDActionKey])
 * @param toPullActionKey to key of whatever is being pulled. given by the action (toPull = action[toPullActionKey])
 */
export function createPullReducer<RootState, SubState>(
  subKey: string, arrayProp: string, toPullIDActionKey: string, toPullActionKey: string
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    return {
      ...state[subKey],
      [action[toPullIDActionKey]]: {
        ...state[subKey][action[toPullIDActionKey]],
        [arrayProp]: (state[subKey][action[toPullIDActionKey]][arrayProp] as any[]).filter(prop => {
          return prop !== action[toPullActionKey]
        })
      }
    }
  }
}

/**
 * 
 * @param subKey the key of the root field the reducer returns
 * @param arrayProp the key of the array of the reducer return object type to pull from
 * @param toPullActionKey to key of whatever is being pulled. given by the action (toPull = action[toPullActionKey])
 * @summary reducer to pull all instances of given value from array at given subfield
 */
export function createPullFromAllReducer<RootState, SubState>(
  subKey: string, arrayProp: string, toPullActionKey: string
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    return objFrom2Arrays(
      Object.keys(state[subKey]),
      Object.values(state[subKey]).map((value: any) => ({
        ...value,
        [arrayProp]: value[arrayProp].filter(entry => entry !== action[toPullActionKey])
      }))
    ) as SubState
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
 * 
 * @param subKey the key of the root field the reducer returns
 * @param arrayProps the keys of the arrays of the reducer return object type to pull from
 * @param toPullIDActionKey the key of the id to pull from. given by the action (id = action[toPullIDActionKey])
 * @param toPullActionKeys to keys of whatever is being pulled. correlated with order of arrayProps. given by the action (toPull = action[toPullActionKeys[i]])
 * @returns the multi pull reducer
 */
export function createMultiPullReducer<RootState, SubState>(
  subKey: string, arrayProps: string[], toPullIDActionKey: string, toPullActionKeys: string[]
): Reducer<RootState, SubState> {
  return (state: any, action: any) => {
    const update = objFrom2Arrays(
      arrayProps, arrayProps.map((arrayProp, i) => (
        state[subKey][action[toPullIDActionKey]][arrayProp].filter(prop => {
          prop !== action[toPullActionKeys[i]]
        })
      ))
    )
    return {
      ...state[subKey],
      [action[toPullIDActionKey]]: {
        ...state[subKey][action[toPullIDActionKey]],
        ...update
      }
    }
  }
}

/**
 * @param subKey the key of the root field the reducer returns
 * @param toReplaceIDActionKey the key of given action containing the id to replace
 * @param toReplaceActionKey the key of given action containing the object to replace at id
 * @returns the replace reducer
 */
export function createReplaceReducer<RootState, SubState>(
  subKey: string, toReplaceIDActionKey: string, toReplaceActionKey: string
) {
  return (state: any, action: any) => {
    return { ...state[subKey], [action[toReplaceIDActionKey]]: action[toReplaceActionKey] }
  }
}

export function createMergeReducer<RootState, SubState>(
  subKey: string, toMergeIDActionKey: string, toMergeActionKey: string
) {
  return (state: any, action: any) => {
    return { ...state[subKey], [action[toMergeIDActionKey]]: { ...state[subKey][action[toMergeIDActionKey]], ...action[toMergeActionKey] } }
  }
}

export function createDynamicReducer<RootState, SubState>(
  subKey: string, config: DynamicReducerConfig
) {
  return (state: any, action: any) => {
    return Object.assign(
      {}, state[subKey],
      config.create ? {
        [action[config.create[0]]]: action[config.create[1]]
      } : {},
      config.delete ? {
        [action[config.delete[0]]]: undefined
      } : {},
      config.replace ? {
        [action[config.replace[0]]]: action[config.replace[1]]
      } : {},
      config.idActionKey ? {
        [action[config.idActionKey]]: Object.assign(
          {}, state[subKey][action[config.idActionKey]],
          config.merge ? action[config.merge[0]] : {},
          config.update ? objFrom2Arrays(
            config.update[0], config.update[1].map(actionKey => action[actionKey])
          ) : {},
          config.push ? {
            [config.push[0]]: [...state[subKey][action[config.idActionKey]][config.push[0]], action[config.push[1]]]
          } : {},
          config.pull ? {
            [config.pull[0]]: state[subKey][action[config.idActionKey]][config.pull[0]].filter(item => item !== action[(config as any).pull[1]])
          } : {},
          config.multiPush ? objFrom2Arrays(
            config.multiPush[0], config.multiPush[1].map((actionKey, i) => 
              [...state[subKey][action[(config as any).idActionKey]][(config as any).multiPush[0][i]], action[actionKey]]
            )
          ) : {},
          config.multiPull ? objFrom2Arrays(
            config.multiPull[0], config.multiPull[1].map((actionKey, i) =>
              state[subKey][action[(config as any).idActionKey]][(config as any).multiPush[0][i]].filter(item => item !== action[actionKey])
            )
          ) : {},
        )
      } : {}
    )
  }
}

/**
 * @param actionTypes array of action types for the reducer to be used for
 * @param reducer the reducer to use for the actions
 * @returns a reducer bundle. { [index: string]: reducer }
 */
export function createSingleReducerBundle<RootState, SubState>(
  actionTypes: string[], reducer: Reducer<RootState, SubState>
): ReducerBundle<RootState, SubState> {
  return objFrom2Arrays(actionTypes, actionTypes.map(() => reducer))
}

/**
 * @param str1 the source string
 * @param str2 the target string.
 * @returns true if source string is contained anywhere within target string
 */
export function roughStringsEqual(str1: string, str2: string) {
  return roughStringsEqualRec(str1.toLowerCase(), str2.toLowerCase())
}

function roughStringsEqualRec(str1: string, str2: string): boolean {
  // assume str1 is shorter, or else false
  if (str1.length > str2.length) {
    return false
  } else if (str1 === str2.slice(0, str1.length)) {
    return true
  } else {
    return roughStringsEqualRec(str1, str2.slice(1, str2.length))
  }
}