import React, { createContext, useContext, useState } from "react";
import MyStatusBar from "../components/myStatusBar";
import { View } from "react-native";

const CallContext = createContext();

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
