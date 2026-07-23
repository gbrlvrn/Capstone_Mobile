import React, { useRef, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useFonts, Raleway_300Light, Raleway_400Regular, Raleway_500Medium, Raleway_700Bold, Raleway_800ExtraBold } from '@expo-google-fonts/raleway';

const { width, height } = Dimensions.get('window');

const LOGO = require('../assets/puac_logo.png');


export default function StartScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(), []);

  const [fontsLoaded] = useFonts({
    Raleway_300Light,
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_700Bold,
    Raleway_800ExtraBold,
  });

  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardSlide,   { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1F45" translucent />

      {/* ── HERO (dark navy top) ── */}
      <View style={styles.hero}>
        {/* Subtle ambient glows */}
        <View style={styles.glowTopLeft} />
        <View style={styles.glowBottomRight} />

        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <Animated.View style={[styles.heroCenter, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>

            {/* Logo icon */}
            <View style={styles.logoWrap}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            </View>

            {/* ── Top tagline row: gold rule + "ALL HONOUR TO GOD" ── */}
            <View style={styles.taglineRow}>
              <View style={styles.taglineRule} />
              <Text style={styles.taglineText}>ALL HONOUR TO GOD</Text>
            </View>

            {/* ── IsangDiwa wordmark — two-tone ── */}
            <View style={styles.wordmarkRow}>
              <Text style={styles.wordmarkWhite}>Isang</Text>
              <Text style={styles.wordmarkGold}>Diwa</Text>
            </View>

            {/* ── Bottom rule + church name ── */}
            <View style={styles.orgRow}>
              <View style={styles.orgRule} />
              <Text style={styles.heroOrg}>Philippine United Apostolic Church</Text>
            </View>

          </Animated.View>
        </SafeAreaView>
      </View>

      {/* ── BOTTOM CARD ── */}
      <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
        <View style={styles.cardHandle} />

        <Text style={styles.cardTitle}>Everything your church needs</Text>
        <Text style={styles.cardSubtitle}>
          One platform for members and officers — connected, secure, and always accessible.
        </Text>


        {/* CTAs */}
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          IsangDiwa · Secure · Trusted · For the Community
        </Text>
      </Animated.View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1F45',
  },

  /* ── HERO ── */
  hero: {
    flex: 1,
    backgroundColor: '#0D1F45',
    overflow: 'hidden',
  },
  heroSafe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTopLeft: {
    position: 'absolute', top: -80, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  glowBottomRight: {
    position: 'absolute', bottom: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(240,192,64,0.04)',
  },
  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  /* ── Logo icon — white circle ── */
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 74,
    height: 74,
  },

  /* ── Tagline row: gold rule + "ALL HONOUR TO GOD" ── */
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  taglineRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F0C040',
  },
  taglineText: {
    fontSize: 10,
    fontFamily: 'Raleway_500Medium',
    color: '#F0C040',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  /* ── Two-tone wordmark ── */
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  wordmarkWhite: {
    fontSize: 52,
    fontWeight: '800',
    fontFamily: 'Raleway_700Bold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  wordmarkGold: {
    fontSize: 52,
    fontWeight: '800',
    fontFamily: 'Raleway_700Bold',
    color: '#D4A843',
    letterSpacing: -1,
  },

  /* ── Org row: gold rule + church name ── */
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orgRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F0C040',
  },
  heroOrg: {
    fontSize: 13,
    fontFamily: 'Raleway_400Regular',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.4,
  },

  /* ── BOTTOM CARD ── */
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    shadowColor: '#0D1F45',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  cardHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    marginBottom: 22,
    fontWeight: '400',
  },

  /* ── BUTTONS ── */
  primaryBtn: {
    backgroundColor: '#0D1F45',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0D1F45',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  /* ── MODAL ── */
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,20,45,0.6)',
  },
  modalCard: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: width * 0.84,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 20,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  modalIcon: {
    width: 28,
    height: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: '400',
  },
  modalBtn: {
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 100,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
