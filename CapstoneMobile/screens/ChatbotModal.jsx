import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "../components/ThemeContext";
import { chatWithBot } from "../services/AuthService";

const CHATBOT_LOGO = require("../assets/puac_logo.png");

const ICONS = {
  close: require("../assets/icons/close.png"),
  send: require("../assets/icons/send.png"),
  chat: require("../assets/puac_logo.png"),
};

const QUICK_QUESTIONS = [
  "How do I apply for a loan?",
  "What are the loan limits?",
  "How do savings work?",
  "Where do I donate?",
  "Check attendance QR",
];

// Removed predefined questions and answers in favor of dynamic backend AI.

/* ─── Typing Dots Component ─── */
function TypingDots({ colors }) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 250, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
      );

    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.botIconCircle}>
        <Image source={ICONS.chat} style={styles.botIcon} resizeMode="contain" />
      </View>
      <View style={[styles.typingBubble, { backgroundColor: colors.cardBg }]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: colors.textMuted, transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

export default function ChatbotModal({ visible, onClose }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [followUpChips, setFollowUpChips] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! I'm IsangDiwa Chatbot, your church assistant. How can I help you today?",
      time: "Now",
    },
  ]);

  const scrollViewRef = useRef(null);

  const sendAndRespond = async (userText) => {
    const newMessage = {
      id: Date.now(),
      type: "user",
      text: userText,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    // Format history for backend (last 8 messages) before adding new user message
    const historyPayload = messages.slice(-8).map((m) => ({
      sender: m.type === "user" ? "user" : "bot",
      text: m.text,
    }));

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
    setIsTyping(true);
    setFollowUpChips([]);

    try {
      const response = await chatWithBot({
        message: userText,
        history: historyPayload,
      });

      if (response && response.success) {
        const botResponse = {
          id: Date.now() + 1,
          type: "bot",
          text: response.reply,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, botResponse]);
        if (response.quickReplies && response.quickReplies.length > 0) {
          setFollowUpChips(response.quickReplies);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.log("Chatbot Error:", err);
      const errorResponse = {
        id: Date.now() + 1,
        type: "bot",
        text: "I'm sorry, I am having trouble connecting to the server right now. Please try again later.",
        time: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !isTyping) {
      sendAndRespond(message.trim());
    }
  };

  const handleQuickQuestion = (question) => {
    if (!isTyping) {
      sendAndRespond(question);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.sidebarBg }]}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={CHATBOT_LOGO}
                style={styles.chatbotLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>IsangDiwa Chatbot</Text>
              <Text style={styles.headerStatus}>
                {isTyping ? "Typing..." : "Online"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Messages Area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageWrapper}>
              {msg.type === "bot" && (
                <View style={styles.botMessageContainer}>
                  <View style={styles.botIconCircle}>
                    <Image
                      source={ICONS.chat}
                      style={styles.botIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={[styles.botMessageBubble, { backgroundColor: colors.cardBg, shadowColor: colors.cardShadow }]}>
                    <Markdown style={{ body: { color: colors.textDark, fontSize: 15, lineHeight: 21 }, paragraph: { marginTop: 0, marginBottom: 0 } }}>
                      {msg.text}
                    </Markdown>
                    <Text style={[styles.messageTime, { color: colors.textMuted, marginTop: 6 }]}>{msg.time}</Text>
                  </View>
                </View>
              )}

              {msg.type === "user" && (
                <View style={styles.userMessageContainer}>
                  <View style={[styles.userMessageBubble, { backgroundColor: colors.blue }]}>
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingDots colors={colors} />}

          {/* Contextual follow-up chips */}
          {followUpChips.length > 0 && !isTyping && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
              {followUpChips.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chipBtn, { borderColor: colors.blueLight }]}
                  onPress={() => handleQuickQuestion(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: colors.blue }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Quick Questions — shown only at start */}
          {messages.length <= 1 && (
            <View style={styles.quickQuestionsSection}>
              <Text style={[styles.quickQuestionsTitle, { color: colors.textMuted }]}>Quick questions:</Text>
              <View style={styles.quickQuestionsGrid}>
                {QUICK_QUESTIONS.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.quickQuestionBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => handleQuickQuestion(question)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickQuestionText, { color: colors.blue }]}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.bg }]}>
            <TextInput
              style={[styles.textInput, { color: colors.textDark }]}
              placeholder="Type your message..."
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.blue }, isTyping && { opacity: 0.5 }]}
              onPress={handleSendMessage}
              activeOpacity={0.7}
              disabled={isTyping}
            >
              <Image
                source={ICONS.send}
                style={styles.sendIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (C) => StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: "#0D1F45",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 42,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatbotLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerStatus: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "400",
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 16,
  },

  // Bot Messages
  botMessageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  botIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0D1F45",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  botIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  botMessageBubble: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    maxWidth: "75%",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  botMessageText: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 6,
  },
  messageTime: {
    fontSize: 11,
  },

  // User Messages
  userMessageContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userMessageBubble: {
    backgroundColor: "#0D1F45",
    borderRadius: 16,
    borderTopRightRadius: 4,
    padding: 14,
    maxWidth: "75%",
  },
  userMessageText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 21,
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Follow-up Chips
  chipsScroll: {
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 42,
  },
  chipBtn: {
    backgroundColor: "rgba(46,107,240,0.08)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Quick Questions
  quickQuestionsSection: {
    marginTop: 8,
  },
  quickQuestionsTitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  quickQuestionsGrid: {
    gap: 8,
  },
  quickQuestionBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickQuestionText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Input Area
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D1F45",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFFFFF",
  },
});
