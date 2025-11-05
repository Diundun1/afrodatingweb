// components/NunitoText.js
import React from "react";
import { Text } from "react-native";
import {
  useFonts,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";

const NunitoText = ({ children, style, weight = "regular", ...props }) => {
  let [fontsLoaded] = useFonts({
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) {
    return (
      <Text style={style} {...props}>
        {children}
      </Text>
    );
  }

  const fontFamily = {
    light: "Nunito_300Light",
    regular: "Nunito_400Regular",
    semibold: "Nunito_600SemiBold",
    bold: "Nunito_700Bold",
    extrabold: "Nunito_800ExtraBold",
    black: "Nunito_900Black",
  }[weight];

  return (
    <Text style={[{ fontFamily }, style]} {...props}>
      {children}
    </Text>
  );
};

export default NunitoText;
