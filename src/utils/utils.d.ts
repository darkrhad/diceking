import { Dispatch, Reducer, ReducerAction, ReducerState } from 'react';

// export default value
declare var version: string;
export default version;

// export a function
export function useReducerWithThunk<R extends Reducer<any, any>>(
  reducer: R,
  initialState: ReducerState<R>,
  name: string
): [ReducerState<R>, Dispatch<ReducerAction<R>>];
