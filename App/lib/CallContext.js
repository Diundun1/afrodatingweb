import React, { createContext, useContext, useState } from "react";
import { View } from "react-native";

const CallContext = createContext();
z;
export function useCall() {
  return useContext(CallContext);
}

export function CallProvider({ children }) {
  const [inCall, setInCall] = useState(false);
  const [participant, setParticipant] = useState("");

  return (
    <CallContext.Provider
      value={{ inCall, setInCall, participant, setParticipant }}>
      {children}
    </CallContext.Provider>
  );
}
