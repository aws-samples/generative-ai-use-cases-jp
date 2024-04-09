import { useState } from 'react';

import {
  decrement,
  increment,
  incrementAsync,
  incrementByAmount,
  incrementIfOdd,
  selectCount,
} from './counterSlice';

import { useAppDispatch, useAppSelector } from '../../hooks';

export function Counter() {
  const count = useAppSelector(selectCount);
  const dispatch = useAppDispatch();
  const [incrementAmount, setIncrementAmount] = useState('2');

  const incrementValue = Number(incrementAmount) || 0;

  return (
    <div className="p-2">
      <div className="flex items-center justify-center mb-4">
        <button
          className="ml-1 mr-2 px-3 text-2xl outline-none border-2 border-solid border-transparent text-purple-500 pb-1 cursor-pointer bg-purple-800 bg-opacity-10 hover:bg-opacity-20 rounded-[2px]"
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
        >
          -
        </button>
        <span className="text-7xl px-4 mt-0.5 font-mono">{count}</span>
        <button
          className="ml-1 mr-2 px-3 text-2xl outline-none border-2 border-solid border-transparent text-purple-500 pb-1 cursor-pointer bg-purple-800 bg-opacity-10 hover:bg-opacity-20 rounded-[2px]"
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
        >
          +
        </button>
      </div>
      <div className="flex items-center justify-center mb-4">
        <input
          className="text-3xl p-0.5 w-16 text-center mr-1 border-[1px]"
          aria-label="Set increment amount"
          value={incrementAmount}
          onChange={(e) => setIncrementAmount(e.target.value)}
        />
        <button
          className="ml-1 mr-2 px-3 pb-1 text-2xl outline-none border-2 border-solid border-transparent text-purple-500 bg-purple-800 bg-opacity-10 hover:bg-opacity-20 rounded-[2px]"
          onClick={() => dispatch(incrementByAmount(incrementValue))}
        >
          Add Amount
        </button>
        <button
          className="ml-1 mr-2 px-3 pb-1 text-2xl outline-none border-2 border-solid border-transparent text-purple-500 bg-purple-800 bg-opacity-10 hover:bg-opacity-20 rounded-[2px]"
          onClick={() => dispatch(incrementAsync(incrementValue))}
        >
          Add Async
        </button>
        <button
          className="ml-1 mr-2 px-3 pb-1 text-2xl outline-none border-2 border-solid border-transparent text-purple-500 bg-purple-800 bg-opacity-10 hover:bg-opacity-20 rounded-[2px]"
          onClick={() => dispatch(incrementIfOdd(incrementValue))}
        >
          Add If Odd
        </button>
      </div>
    </div>
  );
}
