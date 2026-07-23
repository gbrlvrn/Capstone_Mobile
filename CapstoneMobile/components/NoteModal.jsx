import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';

const NoteModal = ({ visible, onClose, date, note, onSave, onNoteChange, colors, saving }) => {
  if (!date) return null;

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <TouchableOpacity 
            style={styles.background} 
            activeOpacity={1} 
            onPress={onClose} 
          />
          <View style={[styles.content, { backgroundColor: colors.cardBg }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textDark }]}>Day Note</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.dateText, { color: colors.textMuted }]}>{formattedDate}</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.textDark, borderColor: colors.cardBorder }]}
              multiline
              placeholder="What happened today? (e.g., Paid installment, applied for loan...)"
              placeholderTextColor={colors.textMuted}
              value={note}
              onChangeText={onNoteChange}
              autoFocus
            />

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.blue }, saving && { opacity: 0.7 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Note</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '90%',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: -500,
    bottom: -500,
    left: -500,
    right: -500,
  },
  content: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    fontSize: 15,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 24,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default NoteModal;
