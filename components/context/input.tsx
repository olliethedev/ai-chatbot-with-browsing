"use client"

import * as React from "react";
import { createContext, useState } from "react";


export interface InputState {
  input: string;
}

export interface InputContextType {
  inputState: InputState;
  setInput: (input: string) => void;
}

export const InputContext = createContext<InputContextType | null>(null);

const initialState: InputState = {
  input: "",
};

const InputProvider = ({ children }: { children: React.ReactNode }) => {
  const [inputState, setInputState] = useState<InputState>(initialState);


  const setInput = async (input: string) => {
    setInputState((prev) => ({
      ...prev,
      input: input,
    }));
  };

  return (
    <InputContext.Provider
      value={{
        inputState,
        setInput,
      }}
    >
      {children}
    </InputContext.Provider>
  );
};
export default InputProvider;
