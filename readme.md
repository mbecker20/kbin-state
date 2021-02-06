## kbin-state

This is a simple state manage for react apps. I'm making it
because redux, even with redux-thunk, is not behaving as well as I would like
with async loading.
With that being said, it's pretty much the same idea, with action / reducers / immutable
state. It also supports undo / redo functionality (on meta + z / meta + shift + z respectively)
as well as "effects", which launch on all dispatchs / undos / redos to perform additional
actions using the updated data (updating backend etc).

# Usage

    export const {
        store,
        dispatch,
        useSelector,
        select,
        useIsInitialized, // picks up when initializer is finished
        undo, redo, // undo / redo functions to call programatically
        canUndo, canRedo, // () => boolean to see if possible to undo / redo at current point
        resetState, // () => void to reset app to initState (pre initialized)
        reInitialize // () => void to reset app to initialized state (calls initializer)
    } = createStore(
        rootReducer, // returns initial state retrieved asyncronously
        initializer?, // async (initState: RootState, force: boolean) => Promise<RootState>
        effects?,
        options?
    )

# Options

    options: {
        onUndo?: () => void,
        onRedo?: () => void,
        log?: boolean = false,
        useLocalStorage?: boolean = false,
        localStorageKey?: string = 'redo-state'
    }

note on the initializer: initState is a default object with the shape of RootState to use 
if the initializer fails. Force is passed true on the first initilialation,
and can be passed optionally as true or false to reInitialize (default false).

# Effects

    effects: {
        [ACTIONTYPE: string]: {
            undo?: (prevState: RootState, effectData: { any }) => void,
            redo?: (nextState: RootState, effectData: { any }) => void,
            both?: (state: RootState, effectData: { any }) => void,
        },
        ...
    }

effects are used to update any data external to the client (ie update the backend)

if an dispatched action has a property "effectData", it will be
stored corresponding to the state history, and later passed to
the corresponding effect function

## StaticStore

There is also a version without undo / redo functionality, but still keeping all other functionality.

Since there are no longer undo / redos, effects only have one direction, so are defined like so.

    effects: {
        [ACTIONTYPE: string]: (nextState: RootState, action: Action) => void
        ...
    }

note that the action is now passed directly to the effect function.



