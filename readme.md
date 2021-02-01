## redo

This is a simple state manager for ether-eye. I'm making it
because redux, even with redux-thunk, is not behaving as well as I would like
with async loading.
With that being said, it's pretty much the same idea, with action / reducers / immutable
state.

    export const { 
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
        effects?,
        initializer?, // async (initState: RootState, force: boolean) => RootState
        options?
    )

    // initializer: initState is a default object with the shape of RootState to use
    //              if the initializer fails. Force is passed true on the first initilialation,
    //              and can be passed optionally as true or false to reInitialize (default false)

    effects: {
        [ACTIONTYPE: string]: {
            undo?: (prevState: RootState, effectData: { any }) => void,
            redo?: (nextState: RootState, effectData: { any }) => void,
            both?: (state: RootState, effectData: { any }) => void,
        },
        ...
    }
    // effects used to update any data external to the client (ie update the backend)

    // if an dispatched action has a property "effectData", it will be
    // stored corresponding to the state history, and later passed to
    // the corresponding effect function

    options: {
        onUndo?: () => void,
        onRedo?: () => void,
        log?: boolean = false,
    }
