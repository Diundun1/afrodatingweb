// components/CustomDatePicker.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";

const CustomDatePicker = ({ value, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const days = Array.from({ length: 31 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const months = monthNames.map((name, i) => ({
    name,
    value: (i + 1).toString().padStart(2, "0"),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) =>
    (currentYear - i).toString()
  ); // last 120 years

  const handleConfirm = () => {
    if (day && month && year) {
      const formatted = `${day}-${month}-${year}`;
      onChange(formatted); // send back to parent
      setShowPicker(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => setShowPicker(true)}
      style={[styles.inputWrapper, { marginTop: 15 }]}>
      {/* Input field */}
      <View
        style={{
          flexDirection: "row",
          //  borderWidth: 1,
          //  borderColor: "#ddd",

          alignItems: "center",
          backgroundColor: "#FAFAFA",
          borderRadius: 0,
          backgroundColor: "red",
        }}>
        <TextInput
          style={{
            paddingVertical: 12,
            paddingHorizontal: 15,
            fontSize: 14,
            width: "100%",
            backgroundColor: "#fff",
          }}
          placeholder="Date Of Birth"
          value={value}
          editable={false}
          placeholderTextColor="#1d1d1d"
        />
      </View>

      {/* Modal picker */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}>
          <View
            style={{
              width: "85%",
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 20,
            }}>
            <Text
              style={{ fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>
              Select Date of Birth
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}>
              {/* Days */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ height: 200, width: "30%" }}
                contentContainerStyle={{ alignItems: "center" }}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDay(d)}
                    style={{
                      padding: 6,
                      borderRadius: 1,
                      backgroundColor: day === d ? "#4169E1" : "#f2f2f2",
                      marginVertical: 2,
                      width: "90%",
                      alignItems: "center",
                    }}>
                    <Text
                      style={{
                        color: day === d ? "#fff" : "#000",
                        fontSize: 12,
                      }}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Months */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ height: 200, width: "30%" }}
                contentContainerStyle={{ alignItems: "center" }}>
                {months.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setMonth(m.value)}
                    style={{
                      padding: 6,
                      borderRadius: 1,
                      backgroundColor:
                        month === m.value ? "#4169E1" : "#f2f2f2",
                      marginVertical: 2,
                      width: "90%",
                      alignItems: "center",
                    }}>
                    <Text
                      style={{
                        color: month === m.value ? "#fff" : "#000",
                        fontSize: 12,
                      }}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Years */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ height: 200, width: "30%" }}
                contentContainerStyle={{ alignItems: "center" }}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    style={{
                      padding: 6,
                      borderRadius: 1,
                      backgroundColor: year === y ? "#4169E1" : "#f2f2f2",
                      marginVertical: 2,
                      width: "90%",
                      alignItems: "center",
                    }}>
                    <Text
                      style={{
                        color: year === y ? "#fff" : "#000",
                        fontSize: 12,
                      }}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={{
                  backgroundColor: "#ccc",
                  paddingVertical: 10,
                  borderRadius: 3,
                  width: "47%",
                  alignItems: "center",
                }}>
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  backgroundColor: "#4169E1",
                  paddingVertical: 10,
                  borderRadius: 3,
                  width: "47%",
                  alignItems: "center",
                }}>
                <Text style={{ color: "#fff" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    //  paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 12,
    backgroundColor: "#fff",
  },
});

export default CustomDatePicker;
