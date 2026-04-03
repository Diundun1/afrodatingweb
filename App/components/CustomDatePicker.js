// components/CustomDatePicker.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CustomDatePicker = ({ value, onChange, maximumDate, minimumDate }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || new Date());

  // Generate years (from 1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, i) => currentYear - i
  );

  // Generate months
  const months = [
    { number: 0, name: "January" },
    { number: 1, name: "February" },
    { number: 2, name: "March" },
    { number: 3, name: "April" },
    { number: 4, name: "May" },
    { number: 5, name: "June" },
    { number: 6, name: "July" },
    { number: 7, name: "August" },
    { number: 8, name: "September" },
    { number: 9, name: "October" },
    { number: 10, name: "November" },
    { number: 11, name: "December" },
  ];

  // Generate days based on selected month and year
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = Array.from(
    {
      length: getDaysInMonth(
        selectedDate.getMonth(),
        selectedDate.getFullYear()
      ),
    },
    (_, i) => i + 1
  );

  const handleConfirm = () => {
    onChange(selectedDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setSelectedDate(value || new Date());
    setShowPicker(false);
  };

  const formatDate = (date) => {
    if (!date) return "Select Date";
    return `${date.getDate().toString().padStart(2, "0")}-${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${date.getFullYear()}`;
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowPicker(true)}>
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : "Select Date of Birth"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#7B61FF" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
            </View>

            <View style={styles.pickerContainer}>
              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.number}
                      style={[
                        styles.pickerItem,
                        selectedDate.getMonth() === month.number &&
                          styles.selectedItem,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(month.number);
                        // Adjust day if needed (e.g., Feb 31 becomes Feb 28/29)
                        const daysInNewMonth = getDaysInMonth(
                          month.number,
                          newDate.getFullYear()
                        );
                        if (newDate.getDate() > daysInNewMonth) {
                          newDate.setDate(daysInNewMonth);
                        }
                        setSelectedDate(newDate);
                      }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDate.getMonth() === month.number &&
                            styles.selectedItemText,
                        ]}>
                        {month.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDate.getDate() === day && styles.selectedItem,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setDate(day);
                        setSelectedDate(newDate);
                      }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDate.getDate() === day &&
                            styles.selectedItemText,
                        ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView
                  style={styles.scrollPicker}
                  showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        selectedDate.getFullYear() === year &&
                          styles.selectedItem,
                      ]}
                      onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(year);
                        // Adjust day if needed (e.g., Feb 29 in non-leap year)
                        const daysInNewMonth = getDaysInMonth(
                          newDate.getMonth(),
                          year
                        );
                        if (newDate.getDate() > daysInNewMonth) {
                          newDate.setDate(daysInNewMonth);
                        }
                        setSelectedDate(newDate);
                      }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedDate.getFullYear() === year &&
                            styles.selectedItemText,
                        ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  placeholderText: {
    color: "#abababff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  pickerContainer: {
    flexDirection: "row",
    height: 300,
    paddingHorizontal: 10,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7B61FF",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  scrollPicker: {
    flex: 1,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedItem: {
    backgroundColor: "#7B61FF",
  },
  pickerItemText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  selectedItemText: {
    color: "white",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#7B61FF",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
});

export default CustomDatePicker;
