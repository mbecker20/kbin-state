import { useEffect, useState } from "react"
import { Action, DispatchEvent, Effects, Initializer, RootReducer, Selector, Store, StoreOptions } from "./index"
import { shallowEqualObjects } from "shallow-equal"
import { useReRender } from "./helpers"
import { INIT_ACTION } from "./index"

const RETRY_TIME = 1000
const LOCAL_STORE_TIMEOUT = 5000
let timeout = false
let timeoutQueue = false

const DEFAULT_OPTIONS = {
  onUndo: () => {},
  onRedo: () => {},
  log: false,
  useLocalStorage: false,
  localStorageKey: 'redo-state'
}

function createStore<RootState>( 
  reducer: RootReducer<RootState>,
  initializer?: Initializer<RootState>,
  effects?: Effects<RootState>,
  options?: StoreOptions
) {
  const { 
    onUndo, onRedo, log,
    useLocalStorage,
    localStorageKey
  } = Object.assign(
    {}, DEFAULT_OPTIONS, options
  )
  const _initState = reducer()
  const store: Store<RootState> = {
    initialized: false,
    acknowledged: false,
    history: [_initState],
    actionHistory: [INIT_ACTION], // history of the action types
    historyIndex: 0, // ie store.state = store.history[store.historyIndex]
    initState: _initState
  }

  if (useLocalStorage) retrieveLocalHistory()

  if (initializer) initializer(store.initState, true).then(initState => {
    if (log) console.log('initializer resolved')
    store.history = [...store.history.slice(0, store.history.length - 1), initState]
    store.initialized = true
    broadcastInitialized()
  })

  window.addEventListener('acknowledged', () => {
    if (log) console.log('store accepts acknowledge')
    store.acknowledged = true
  })

  window.addEventListener('keydown', e => {
    if (e.metaKey && e.key === 'z') {
      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
  })
  
  function getState() {
    return store.history[store.historyIndex]
  }
  function getPrevState() {
    return store.history[store.historyIndex - 1]
  }
  function getNextState() {
    return store.history[store.historyIndex + 1]
  }

  function resetState() {
    const prevState = getState()
    store.history = [store.initState]
    store.actionHistory = [INIT_ACTION]
    store.historyIndex = 0
    window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
      detail: {
        prevState,
        nextState: store.initState,
      }
    }))
  }

  async function reInitialize(force?: boolean) {
    const prevState = getState()
    if (initializer) {
      await initializer(prevState, force ? true : false).then(nextState => {
        store.history = [nextState]
        store.actionHistory = [INIT_ACTION]
        store.historyIndex = 0
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
      store.history = [JSON.parse(restore)]
    }
  }
  
  function updateLocalHistory() {
    if (!timeout) {
      window.localStorage.setItem(
        localStorageKey, JSON.stringify(getState())
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

  function dispatch(action?: Action) {
    if (action) {
      if (log) console.log(`dispatching ${action.type}`);
      const state = reducer(getState(), action);
      store.history = [
        ...store.history.slice(0, store.historyIndex + 1),
        state,
      ];
      store.actionHistory = [
        ...store.actionHistory.slice(0, store.historyIndex + 1),
        {
          type: action.type,
          effectData: action.effectData,
        },
      ];
      store.historyIndex++;
      forwardEffect(true);
      if (useLocalStorage) updateLocalHistory();
      if (log) console.log(`history index: ${store.historyIndex}`);
      window.dispatchEvent(
        new CustomEvent<DispatchEvent<RootState>>("dispatch", {
          detail: {
            prevState: getPrevState(),
            nextState: getState(),
          },
        })
      );
    }
  }

  function forwardEffect(firstTime = false) {
    // run after updating historyIndex
    if (
      effects && effects[store.actionHistory[store.historyIndex].type]
    ) {
      if (effects[store.actionHistory[store.historyIndex].type].redo) {
        (effects[store.actionHistory[store.historyIndex].type].redo as any)(
          getState(), store.actionHistory[store.historyIndex].effectData, firstTime
        )
      }
      if (effects[store.actionHistory[store.historyIndex].type].both) {
        (effects[store.actionHistory[store.historyIndex].type].both as any)(
          getState(), store.actionHistory[store.historyIndex].effectData
        )
      }
    }
  }

  function backwardEffect() {
    // run after updating historyIndex
    const index = store.historyIndex + 1
    if (
      effects && effects[store.actionHistory[index].type]
    ) {
      if (effects[store.actionHistory[index].type].undo) {
        (effects[store.actionHistory[index].type].undo as any)(
          getState(), store.actionHistory[index].effectData
        )
      }
      if (effects[store.actionHistory[index].type].both) {
        (effects[store.actionHistory[index].type].both as any)(
          getState(), store.actionHistory[index].effectData
        )
      }
    }
  }

  function canUndo() {
    return store.historyIndex > 0
  }

  function canRedo() {
    return store.historyIndex < store.history.length - 1
  }

  function undo() {
    if (store.historyIndex > 0) {
      store.historyIndex -= 1
      backwardEffect()
      window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
        // this tells the components to update if they need it
        detail: {
          prevState: getNextState(), // this is a funny one
          nextState: getState(),
        }
      }))
      if (onUndo) onUndo()
      if (useLocalStorage) updateLocalHistory()
      if (log) {
        console.log('undo')
        console.log(`history index: ${store.historyIndex}`)
      } 
    }
  }

  function redo() {
    if (store.historyIndex < store.history.length - 1) {
      store.historyIndex += 1
      forwardEffect()
      window.dispatchEvent(new CustomEvent<DispatchEvent<RootState>>('dispatch', {
        detail: {
          prevState: getPrevState(),
          nextState: getState(),
        }
      }))
      if (onRedo) onRedo()
      if (useLocalStorage) updateLocalHistory()
      if (log) {
        console.log('redo')
        console.log(`history index: ${store.historyIndex}`)
      }
    }
  }

  function select<Return>(selector: Selector<RootState, Return>) {
    return selector(getState())
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

    return selector(getState())
  }

  function useFullSelector() {
    const rerender = useReRender()
    const listener = () => rerender()
    useEffect(() => {
      window.addEventListener('dispatch', listener as any)
      return () => {
        window.removeEventListener('dispatch', listener as any)
      }
    }, [])
    return getState()
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
    useFullSelector,
    select,
    useIsInitialized,
    undo, redo,
    canUndo, canRedo,
    resetState,
    reInitialize
  }
}

export default createStore