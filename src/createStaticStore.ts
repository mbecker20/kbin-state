import { useEffect, useState } from "react"
import { Action, DispatchEvent, StaticEffects, Initializer, RootReducer, Selector, StaticStore, StaticStoreOptions, ThunkAction } from "./index"
import { shallowEqualObjects } from "shallow-equal"
import { useReRender } from "./helpers"

const RETRY_TIME = 1000
const LOCAL_STORE_TIMEOUT = 5000
let timeout = false
let timeoutQueue = false

export const INIT_ACTION = {
  type: 'INIT'
}

const DEFAULT_OPTIONS = {
  log: false,/*  */
  useLocalStorage: false,
  localStorageKey: 'redo-state'
}

function createStaticStore<RootState>(
  reducer: RootReducer<RootState>,
  initializer?: Initializer<RootState>,
  effects?: StaticEffects<RootState>,
  options?: StaticStoreOptions
) {
  const {
    log, useLocalStorage,
    localStorageKey
  } = Object.assign(
    {}, DEFAULT_OPTIONS, options
  )
  const _initState = reducer()
  const store: StaticStore<RootState> = {
    initialized: false,
    acknowledged: false,
    state: _initState,
    initState: _initState
  }

  if (useLocalStorage) retrieveLocalHistory()

  if (initializer) initializer(store.initState, true).then(_initState => {
    if (log) console.log('initializer resolved')
    store.state = _initState
    store.initialized = true
    broadcastInitialized()
  })

  window.addEventListener('acknowledged', () => {
    if (log) console.log('store accepts acknowledge')
    store.acknowledged = true
  })

  function resetState() {
    const prevState = store.state
    store.state = store.initState
    window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
      detail: {
        prevState,
        nextState: store.initState,
      }
    }))
  }

  async function reInitialize(force?: boolean) {
    const prevState = store.state as RootState
    if (initializer) {
      await initializer(store.initState, force ? true : false).then(nextState => {
        store.state = nextState
        window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
          detail: {
            prevState,
            nextState,
          }
        }))
      })
    }
  }

  function retrieveLocalHistory() {
    const restore = window.localStorage.getItem(localStorageKey)
    if (
      restore && restore !== 'undefined'
    ) {
      store.state = JSON.parse(restore)
    }
  }

  function updateLocalHistory() {
    if (!timeout) {
      window.localStorage.setItem(
        localStorageKey, JSON.stringify(store.state)
      )
      timeout = true
      window.setTimeout(() => { timeout = false }, LOCAL_STORE_TIMEOUT)
    } else if (!timeoutQueue) {
      timeoutQueue = true
      window.setTimeout(() => {
        timeoutQueue = false
        updateLocalHistory()
      }, LOCAL_STORE_TIMEOUT)
    }
  }

  function dispatch(action: Action | ThunkAction) {
    if (typeof (action) === 'function') {
      return action(dispatch)
    } else {
      if (log) console.log(`dispatching ${action.type}`)
      const prevState = store.state
      store.state = reducer(store.state, action)
      forwardEffect(action)
      if (useLocalStorage) updateLocalHistory()
      if (log) console.log(`dipatch: ${action.type}`)
      window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
        detail: {
          prevState,
          nextState: store.state,
        }
      }))
    }
  }

  function forwardEffect(action: Action) {
    // run after updating historyIndex
    if (effects && effects[action.type]) {
      (effects[action.type] as any)(
        store.state, action
      )
    }
  }

  function select<Return>(selector: Selector<RootState, Return>) {
    return selector(store.state)
  }

  function useSelector<Return>(selector: Selector<RootState, Return>) {
    const rerender = useReRender()
    const listener = (e: CustomEvent<DispatchEvent<RootState>>) => {
      const { prevState, nextState } = e.detail
      if (!shallowEqualObjects(selector(prevState), selector(nextState))) {
        if (log) console.log('dif')
        rerender()
      } else {
        if (log) console.log('not dif')
      }
    }
    useEffect(() => {
      window.addEventListener('dispatch', listener as any)
      return () => {
        window.removeEventListener('dispatch', listener as any)
      }
    }, [])

    return selector(store.state)
  }

  function useIsInitialized(onInitialized?: () => void) {
    const [initialized, setInitialized] = useState(false)
    useEffect(() => {
      window.addEventListener('initialized', () => {
        setInitialized(true)
        if (onInitialized) onInitialized()
        window.dispatchEvent(new Event('acknowledged'))
      })
    }, [])
    return initialized
  }

  function broadcastInitialized() {
    if (!store.acknowledged) {
      window.dispatchEvent(new Event('initialized'))
      window.setTimeout(broadcastInitialized, RETRY_TIME)
    }
  }
  return {
    store,
    dispatch,
    useSelector,
    select,
    useIsInitialized,
    resetState,
    reInitialize
  }
}

export default createStaticStore