import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
  Modal,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signupUser, getBranches, saveUserData } from "../services/AuthService";
import { useAlert } from "../components/AlertContext";
import { useTheme } from "../components/ThemeContext";

const { width: _SW } = Dimensions.get("window");
const _WR = Math.min(_SW / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));

const LOGO = require("../assets/puac_logo.png");

// ── Icon assets ──
const ICONS = {
  person: require("../assets/icons/person.png"),
  email: require("../assets/icons/email.png"),
  phone: require("../assets/icons/phone.png"),
  building: require("../assets/icons/building.png"),
  badge: require("../assets/icons/badge.png"),
  gender: require("../assets/icons/gender.png"),
  calendar: require("../assets/icons/calendar.png"),
  lock: require("../assets/icons/lock.png"),
  eyeOpen: require("../assets/icons/eye-open.png"),
  eyeClosed: require("../assets/icons/eye-closed.png"),
};

// Initial empty state for branches (will be populated from API)
const INITIAL_BRANCHES = [];

const POSITIONS = [
  "Deacon",
  "Local Evangelist",
  "District Evangelist",
  "National Evangelist",
  "Assistant Priest",
  "Priest",
  "Elder",
  "District Elder",
  "Bishop",
  "District Bishop",
  "National Bishop",
  "Apostle",
];

const GENDERS = ["Male", "Female"];

const C = {
  bg: "#FAFCFE",
  cardBg: "#FFFFFF",
  inputBg: "#FFFFFF",
  inputBorder: "#F1F5F9",
  inputBorderErr: "#E74C3C",
  inputBorderFocus: "#0D1F45",
  btnBlue: "#0D1F45",
  btnblue: "#0D1F45",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textDimmed: "#94A3B8",
  iconColor: "#64748B",
  linkblue: "#0D1F45",
  linkBlue: "#0D1F45",
  checkboxBorder: "#E2E8F0",
  checkboxBg: "#0D1F45",
  errorText: "#E74C3C",
  modalBg: "#FFFFFF",
  modalItemHover: "#F8FAFC",
  modalDivider: "#F1F5F9",
  successBorder: "#10B981",
};

const isValidEmail = (e) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(e.trim())) return false;
  
  const [localPart, domain] = e.trim().toLowerCase().split('@');
  if (localPart.length > 64) return false;

  const blockedDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com'];
  if (blockedDomains.includes(domain)) return false;

  return true;
};

const isValidPhone = (p) => {
  // Phone should be exactly +63 followed by 10 digits
  const digits = p.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('63');
};

const isValidDOB = (d) => {
  const match = d.match(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(\d{4})$/);
  if (!match) return false;
  const year = parseInt(match[3], 10);
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Check if year is valid
  if (year < 1900 || year > currentYear) return false;
  
  // Calculate age
  const birthDate = new Date(year, month - 1, day);
  let age = currentYear - year;
  const monthDiff = now.getMonth() - (month - 1);
  const dayDiff = now.getDate() - day;
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  
  // Must be 18 to 100 years old
  return age >= 18 && age <= 100;
};

// Helper components for branch modal
function BranchCategory({ title }) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryTitle}>{title}</Text>
    </View>
  );
}

function BranchOption({ option, selected, onSelect }) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Handle both string format (legacy) and object format (dynamic)
  const displayName = typeof option === 'string' 
    ? (option.includes(' - ') ? option.split(' - ').slice(1).join(' - ') : option)
    : option.name;
  
  return (
    <>
      <TouchableOpacity
        style={[styles.modalItem, selected && styles.modalItemActive]}
        activeOpacity={0.6}
        onPress={onSelect}
      >
        <Text style={[styles.modalItemText, selected && styles.modalItemTextActive]}>
          {displayName}
        </Text>
        {selected && <Text style={styles.modalCheck}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.modalDivider} />
    </>
  );
}

export default function SignupScreen({ navigation }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+63 ",
    gender: "",
    dob: "",
    branch: "",
    role: "member",
    churchId: "",
    position: "",
    password: "",
    confirmPassword: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalField, setModalField] = useState("");
  const [dynamicBranches, setDynamicBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch branches from API on mount
  useEffect(() => {
    let mounted = true;
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const res = await getBranches();
        if (mounted && res?.success) {
          // Keep as objects, but sort by name
          const sorted = res.branches.sort((a, b) => a.name.localeCompare(b.name));
          setDynamicBranches(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
      } finally {
        if (mounted) setLoadingBranches(false);
      }
    };
    fetchBranches();
    return () => { mounted = false; };
  }, []);

  // Group branches by province for the modal
  const groupedBranches = useMemo(() => {
    const groups = {};
    dynamicBranches.forEach(b => {
      const province = b.province || "Other";
      if (!groups[province]) groups[province] = [];
      groups[province].push(b);
    });
    return groups;
  }, [dynamicBranches]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const touch = (key) => setTouched((p) => ({ ...p, [key]: true }));

  const passRules = [
    { label: "At least 8 characters", met: form.password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(form.password) },
    { label: "At least one number or more", met: /[0-9]/.test(form.password) },
    { label: "At least 1 symbol (@#$%^_!)", met: /[@#$%^_!]/.test(form.password) },
  ];

  const strengthCount = passRules.filter((r) => r.met).length;
  const strengthLabel = ["Weak", "Weak", "Fair", "Good", "Strong"][strengthCount];
  const strengthColor = ["#D1D5DB", "#EF4444", "#FF9500", "#FBBF24", "#10B981"][strengthCount];

  const churchIdMatchesPosition = (idStr, pos) => {
    const map = {
      "Deacon": "00-00",
      "Local Evangelist": "00-01",
      "District Evangelist": "00-02",
      "National Evangelist": "00-03",
      "Assistant Priest": "00-04",
      "Priest": "00-05",
      "Elder": "00-06",
      "District Elder": "00-06",
      "Bishop": "00-07",
      "District Bishop": "00-08",
      "National Bishop": "00-09",
      "Apostle": "00-10",
    };
    const expectedPrefix = map[pos];
    if (!expectedPrefix) return false;
    return idStr.startsWith(expectedPrefix);
  };

  const errors = {
    firstName: !form.firstName.trim() 
      ? "First name is required" 
      : form.firstName.trim().length > 30 || form.firstName.trim().length < 2
      ? "Name must be 2-30 characters"
      : !/^[A-Za-z\s'\-]+$/.test(form.firstName.trim())
      ? "Letters, spaces, hyphens, or apostrophes only"
      : "",
    lastName: !form.lastName.trim() 
      ? "Last name is required"
      : form.lastName.trim().length > 30 || form.lastName.trim().length < 2
      ? "Name must be 2-30 characters"
      : !/^[A-Za-z\s'\-]+$/.test(form.lastName.trim())
      ? "Letters, spaces, hyphens, or apostrophes only"
      : "",
    email: !form.email.trim()
      ? "Email is required"
      : !isValidEmail(form.email)
      ? "Enter a valid email address (disposable domains blocked)"
      : "",
    phone: !form.phone.trim() || form.phone.trim() === "+63 "
      ? "Phone number is required"
      : !isValidPhone(form.phone)
      ? "Enter exactly 10 digits after +63"
      : "",
    gender: !form.gender ? "Please select a gender" : "",
    dob: !form.dob.trim()
      ? "Date of birth is required"
      : !isValidDOB(form.dob)
      ? "Age must be strictly between 18 and 100 years old"
      : "",
    branch: !form.branch ? "Please select a community" : "",
    churchId: form.role === "officer"
      ? (!form.churchId.trim()
        ? "Church ID is required for officers"
        : !/^\d{2}-\d{2}-\d{2}$/.test(form.churchId.trim())
        ? "Church ID must follow XX-XX-XX format"
        : "")
      : "",
    position: form.role === "officer" 
      ? (!form.position
        ? "Please select your position"
        : form.churchId && !churchIdMatchesPosition(form.churchId.trim(), form.position)
        ? `Church ID prefix does not match ${form.position} validation mapping.`
        : "") 
      : "",
    password: !form.password
      ? "Password is required"
      : form.password.length < 8
      ? "Password must be at least 8 characters"
      : form.password.length > 72
      ? "Password must be under 72 characters max"
      : !/[A-Z]/.test(form.password)
      ? "Password must contain an uppercase letter"
      : !/[a-z]/.test(form.password)
      ? "Password must contain a lowercase letter"
      : !/[0-9]/.test(form.password)
      ? "Password must contain a number"
      : !/[@#$%^_!]/.test(form.password)
      ? "Password must contain a symbol (@#$%^_!)"
      : "",
    confirmPassword: !form.confirmPassword
      ? "Please confirm your password"
      : form.confirmPassword !== form.password
      ? "Passwords do not match"
      : "",
  };

  const openModal = (field) => {
    setModalField(field);
    setModalOpen(true);
  };

  const selectOption = (item) => {
    // If it's a branch, we might want the full name or just the ID. 
    // Usually the app stores the string "Province - Branch" for backward compatibility.
    if (modalField === "branch") {
      const val = typeof item === 'string' ? item : `${item.province} - ${item.name}`;
      update(modalField, val);
    } else {
      update(modalField, item);
    }
    touch(modalField);
    setModalOpen(false);
  };

  const handleDOB = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2)
      formatted = digits.slice(0, 2) + "-" + digits.slice(2);
    if (digits.length > 4)
      formatted =
        digits.slice(0, 2) +
        "-" +
        digits.slice(2, 4) +
        "-" +
        digits.slice(4);
    update("dob", formatted);
  };

  const handlePhone = (raw) => {
    // Always keep +63 prefix
    if (!raw.startsWith('+63')) {
      update("phone", "+63 ");
      return;
    }
    
    // Extract only digits after +63
    const digitsOnly = raw.slice(3).replace(/\D/g, "");
    
    // Limit to 10 digits
    const limitedDigits = digitsOnly.slice(0, 10);
    
    // Format as +63 XXXXXXXXXX
    update("phone", "+63 " + limitedDigits);
  };

  const handleChurchId = (value) => {
    let digitsOnly = value.replace(/\D/g, "").slice(0, 6);
    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + "-" + digitsOnly.slice(2);
    }
    if (digitsOnly.length > 4) {
      formatted = digitsOnly.slice(0, 2) + "-" + digitsOnly.slice(2, 4) + "-" + digitsOnly.slice(4);
    }
    update("churchId", formatted);
  };



  const handleName = (key, value) => {
    // Only allow letters and spaces, limit to 15 characters
    const lettersOnly = value.replace(/[^a-zA-Z\s]/g, "");
    if (lettersOnly.length <= 15) {
      update(key, lettersOnly);
    }
  };

  // sends data to backend to save in MongoDB
  const handleSubmit = async () => {
    const allTouched = Object.keys(form).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {}
    );
    setTouched(allTouched);

    if (!agreedTerms) {
      showAlert(
        "Terms Required",
        "You must agree to the Terms and Conditions and Privacy Policy."
      );
      return;
    }

    const firstError = Object.keys(errors).find((k) => errors[k]);
    if (firstError) {
      showAlert("Validation Error", errors[firstError]);
      return;
    }

    try {
      setSubmitting(true);

      const parts = form.dob.trim().split('-');
      let isoBirthday = form.dob.trim();
      if (parts.length === 3) {
        // parts[0] is MM, parts[1] is DD, parts[2] is YYYY
        isoBirthday = new Date(Date.UTC(parts[2], parts[0] - 1, parts[1], 0, 0, 0)).toISOString();
      }

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\s+/g, ""),
        branch: form.branch,
        gender: form.gender.toLowerCase(),
        birthday: isoBirthday,
        password: form.password,
        role: form.role,
      };

      if (form.role === "officer") {
        payload.churchId = form.churchId.trim();
        payload.position = form.position;
      }

      await signupUser(payload);

      try {
        await saveUserData({
          email: form.email.trim().toLowerCase(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
          role: form.role,
          position: form.position || "",
        });
      } catch (err) {
        console.log("Failed to cache signup user data:", err);
      }

      navigation.navigate("VerifyOTP", {
        email: form.email.trim().toLowerCase(),
        source: "signup",
      });
    } catch (e) {
      showAlert("Signup Failed", e.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const borderFor = (key) => {
    if (!touched[key]) return C.inputBorder;
    return errors[key] ? C.inputBorderErr : C.successBorder;
  };

  return (
    <View style={styles.screen}>
      <View style={styles.circleTopRight} pointerEvents="none" />
      <View style={styles.circleBottomLeft} pointerEvents="none" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join our church community today</Text>

           {/* Role Selector */}
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                form.role === "member" && styles.roleCardActive,
              ]}
              onPress={() => { update("role", "member"); touch("role"); }}
              activeOpacity={0.7}
            >
              <Image 
                source={ICONS.person} 
                style={[
                  styles.roleIcon, 
                  { tintColor: form.role === "member" ? '#0D1F45' : C.iconColor }
                ]} 
                resizeMode="contain" 
              />
              <Text style={[
                styles.roleCardTitle,
                form.role === "member" && styles.roleCardTitleActive,
              ]}>Member</Text>
              <Text style={styles.roleCardSub}>Donations, Attendance{"\n"}& Church Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleCard,
                form.role === "officer" && styles.roleCardActive,
              ]}
              onPress={() => { update("role", "officer"); touch("role"); }}
              activeOpacity={0.7}
            >
              <Image 
                source={ICONS.badge} 
                style={[
                  styles.roleIcon, 
                  { tintColor: form.role === "officer" ? '#0D1F45' : C.iconColor }
                ]} 
                resizeMode="contain" 
              />
              <Text style={[
                styles.roleCardTitle,
                form.role === "officer" && styles.roleCardTitleActive,
              ]}>Officer</Text>
              <Text style={styles.roleCardSub}>All Member features{"\n"}+ Loans, Savings & More</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: C.textDimmed, textAlign: "center", marginBottom: 12, lineHeight: 16 }}>
            Officers are church-appointed leaders who manage loans and savings.{"\n"}A valid Church ID is required to register as an Officer.
          </Text>

          {/* First Name */}
          <Text style={styles.label}>First Name</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("firstName") }]}>
            <Image source={ICONS.person} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor={C.textDimmed}
              value={form.firstName}
              onChangeText={(v) => handleName("firstName", v)}
              onBlur={() => touch("firstName")}
              maxLength={15}
            />
          </View>
          {touched.firstName && errors.firstName ? (
            <Text style={styles.errorMsg}>{errors.firstName}</Text>
          ) : (
            <Text style={styles.hintMsg}>Letters only, max 15 characters</Text>
          )}

          {/* Last Name */}
          <Text style={styles.label}>Last Name</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("lastName") }]}>
            <Image source={ICONS.person} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor={C.textDimmed}
              value={form.lastName}
              onChangeText={(v) => handleName("lastName", v)}
              onBlur={() => touch("lastName")}
              maxLength={15}
            />
          </View>
          {touched.lastName && errors.lastName ? (
            <Text style={styles.errorMsg}>{errors.lastName}</Text>
          ) : (
            <Text style={styles.hintMsg}>Letters only, max 15 characters</Text>
          )}

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("email") }]}>
            <Image source={ICONS.email} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={styles.input}
              placeholder="youremail@gmail.com"
              placeholderTextColor={C.textDimmed}
              value={form.email}
              onChangeText={(v) => update("email", v)}
              onBlur={() => touch("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {touched.email && errors.email ? (
            <Text style={styles.errorMsg}>{errors.email}</Text>
          ) : null}

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("phone") }]}>
            <Image source={ICONS.phone} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={styles.input}
              placeholder="+63 0000000000"
              placeholderTextColor={C.textDimmed}
              value={form.phone}
              onChangeText={handlePhone}
              onBlur={() => touch("phone")}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>
          {touched.phone && errors.phone ? (
            <Text style={styles.errorMsg}>{errors.phone}</Text>
          ) : null}

          {/* Gender & DOB Row */}
          <View style={styles.rowContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderCardContainer}>
                {GENDERS.map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={styles.genderRadioOption}
                    onPress={() => {
                      update("gender", gender);
                      touch("gender");
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioOuter}>
                      {form.gender === gender && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.genderRadioText,
                        form.gender === gender && styles.genderRadioTextActive,
                      ]}
                    >
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {touched.gender && errors.gender ? (
                <Text style={styles.errorMsg}>{errors.gender}</Text>
              ) : null}
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={[styles.inputRow, { borderColor: borderFor("dob") }]}>
                <Image source={ICONS.calendar} style={styles.inputIcon} resizeMode="contain" />
                <TextInput
                  style={styles.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={C.textDimmed}
                  value={form.dob}
                  onChangeText={handleDOB}
                  onBlur={() => touch("dob")}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {touched.dob && errors.dob ? (
                <Text style={styles.errorMsg}>{errors.dob}</Text>
              ) : form.dob.length === 10 && isValidDOB(form.dob) ? (
                <Text style={[styles.hintMsg, { fontStyle: 'normal' }]}>
                  Age: {
                    (() => {
                      const parts = form.dob.split("-");
                      if (parts.length === 3) {
                         const birthDate = new Date(parts[2], parts[0] - 1, parts[1]);
                         let age = new Date().getFullYear() - birthDate.getFullYear();
                         const m = new Date().getMonth() - birthDate.getMonth();
                         if (m < 0 || (m === 0 && new Date().getDate() < birthDate.getDate())) {
                           age--;
                         }
                         return age;
                      }
                      return "--";
                    })()
                  } years old
                </Text>
              ) : null}
            </View>
          </View>

          {/* Branch */}
          <Text style={styles.label}>Community</Text>
          <TouchableOpacity
            style={[styles.inputRow, { borderColor: borderFor("branch") }]}
            activeOpacity={0.6}
            onPress={() => {
              touch("branch");
              openModal("branch");
            }}
          >
            <Image source={ICONS.building} style={styles.inputIcon} resizeMode="contain" />
            <Text
              style={[
                styles.input,
                { color: form.branch ? C.textDark : C.textDimmed },
              ]}
            >
              {form.branch || "Select your community"}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>
          {touched.branch && errors.branch ? (
            <Text style={styles.errorMsg}>{errors.branch}</Text>
          ) : null}

          {/* Officer-only fields */}
          {form.role === "officer" && (
            <>
              {/* Church ID */}
              <Text style={styles.label}>Church ID</Text>
              <View style={[styles.inputRow, { borderColor: borderFor("churchId") }]}>
                <Image source={ICONS.badge} style={styles.inputIcon} resizeMode="contain" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Church ID number"
                  placeholderTextColor={C.textDimmed}
                  value={form.churchId}
                  onChangeText={handleChurchId}
                  onBlur={() => touch("churchId")}
                  keyboardType="number-pad"
                  maxLength={12}
                />
              </View>
              {touched.churchId && errors.churchId ? (
                <Text style={styles.errorMsg}>{errors.churchId}</Text>
              ) : (
                <Text style={styles.hintMsg}>Numbers only, max 12 digits</Text>
              )}

              {/* Position */}
              <Text style={styles.label}>Position</Text>
              <TouchableOpacity
                style={[styles.inputRow, { borderColor: borderFor("position") }]}
                activeOpacity={0.6}
                onPress={() => {
                  touch("position");
                  openModal("position");
                }}
              >
                <Image source={ICONS.badge} style={styles.inputIcon} resizeMode="contain" />
                <Text
                  style={[
                    styles.input,
                    { color: form.position ? C.textDark : C.textDimmed },
                  ]}
                >
                  {form.position || "Select your position"}
                </Text>
                <Text style={styles.chevron}>▾</Text>
              </TouchableOpacity>
              {touched.position && errors.position ? (
                <Text style={styles.errorMsg}>{errors.position}</Text>
              ) : null}
            </>
          )}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("password") }]}>
            <Image source={ICONS.lock} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Create your password"
              placeholderTextColor={C.textDimmed}
              value={form.password}
              onChangeText={(v) => update("password", v)}
              onBlur={() => touch("password")}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Image
                source={showPass ? ICONS.eyeOpen : ICONS.eyeClosed}
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          {touched.password && errors.password ? (
            <Text style={styles.errorMsg}>{errors.password}</Text>
          ) : null}

          {/* Password strength meter */}
          {form.password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      { backgroundColor: i < strengthCount ? strengthColor : "#E5E7EB" },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                {strengthLabel}
              </Text>
            </View>
          )}

          {/* Password rules */}
          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>Password must contain:</Text>
            {passRules.map((r, i) => (
              <Text key={i} style={[styles.ruleItem, r.met && styles.ruleItemMet]}>
                {r.met ? "✓" : "*"} {r.label}
              </Text>
            ))}
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputRow, { borderColor: borderFor("confirmPassword") }]}>
            <Image source={ICONS.lock} style={styles.inputIcon} resizeMode="contain" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirm your password"
              placeholderTextColor={C.textDimmed}
              value={form.confirmPassword}
              onChangeText={(v) => update("confirmPassword", v)}
              onBlur={() => touch("confirmPassword")}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Image
                source={showConfirm ? ICONS.eyeOpen : ICONS.eyeClosed}
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          {touched.confirmPassword && errors.confirmPassword ? (
            <Text style={styles.errorMsg}>{errors.confirmPassword}</Text>
          ) : null}

          {/* Terms checkbox */}
          <View style={styles.termsRow}>
            <Pressable
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', paddingVertical: 10, marginTop: -10, opacity: pressed ? 0.6 : 1, zIndex: 999 }]}
              onPress={() => setAgreedTerms(prev => !prev)}
            >
              <View style={[styles.checkbox, agreedTerms && { backgroundColor: '#0D1F45', borderColor: '#0D1F45' }, { marginTop: 2, marginRight: 8 }]}>
                {agreedTerms && <Text style={{ fontSize: 12, color: "#FFF", fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={[styles.termsText, { flex: 0 }]}>
                I agree to the{" "}
              </Text>
            </Pressable>
            <Text style={[styles.termsText, { flex: 1, marginTop: 0 }]}>
              <Text style={styles.termsLink} onPress={() => setDocModal("terms")}>
                Terms and Conditions
              </Text>{" "}
              and{" "}
              <Text style={styles.termsLink} onPress={() => setDocModal("privacy")}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          {/* Pre-submit validation block */}
          {(() => {
            const hasErrors = Object.values(errors).some(err => err);
            const isDisabled = submitting || !agreedTerms || hasErrors;
            return (
              <TouchableOpacity
                style={[styles.createBtn, isDisabled && { opacity: 0.5, backgroundColor: "#9CA3AF" }]}
                activeOpacity={isDisabled ? 1 : 0.8}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.createBtnText}>
                  {submitting ? "Creating..." : "Create Account"}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalOpen(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {modalField === "branch"
                ? "Select Community"
                : modalField === "position"
                ? "Select Position"
                : "Select Gender"}
            </Text>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={true}
            >
              {modalField === "branch" ? (
                loadingBranches ? (
                  <View style={{ padding: s(40), alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0D1F45" />
                    <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading communities...</Text>
                  </View>
                ) : (
                  Object.entries(groupedBranches).map(([province, branches]) => (
                    <View key={province}>
                      <BranchCategory title={province} />
                      {branches.map((opt) => (
                        <BranchOption 
                          key={opt._id || opt.name} 
                          option={opt} 
                          selected={form.branch === `${opt.province} - ${opt.name}`}
                          onSelect={() => selectOption(opt)}
                        />
                      ))}
                    </View>
                  ))
                )
              ) : (
                (modalField === "position" ? POSITIONS : ["Male", "Female", "Prefer not to say"]).map((opt, i, arr) => (
                  <React.Fragment key={opt}>
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        form[modalField] === opt && styles.modalItemActive,
                      ]}
                      activeOpacity={0.6}
                      onPress={() => selectOption(opt)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          form[modalField] === opt && styles.modalItemTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                      {form[modalField] === opt && (
                        <Text style={styles.modalCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                    {i < arr.length - 1 && (
                      <View style={styles.modalDivider} />
                    )}
                  </React.Fragment>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Terms/Privacy Modal */}
      <Modal
        visible={docModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDocModal(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setDocModal(null)}
        >
          <View style={styles.docSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.docTitle}>
              {docModal === "terms" ? "Terms and Conditions" : "Privacy Policy"}
            </Text>

            <ScrollView
              style={styles.docScroll}
              showsVerticalScrollIndicator={true}
            >
              {(docModal === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS).map(
                (section, i) => (
                  <View key={i} style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>{section.title}</Text>
                    <Text style={styles.docSectionBody}>{section.body}</Text>
                  </View>
                )
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.docCloseBtn}
              activeOpacity={0.7}
              onPress={() => setDocModal(null)}
            >
              <Text style={styles.docCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing and using IsangDiwa, a digital church management system developed for the Philippine United Apostolic Church, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must discontinue use of the system.",
  },
  {
    title: "2. Purpose of the System",
    body: "PUAC is designed to facilitate transparent and accountable management of church-related loan applications, approvals, payments, and member records in support of responsible financial stewardship.",
  },
  {
    title: "3. Authorized Users",
    body: "Only registered and approved church members, officers, and administrators are permitted to access PUAC. Access rights are assigned based on user roles defined by church authorities.",
  },
  {
    title: "4. User Responsibilities",
    body: "Users are responsible for maintaining the confidentiality of their login credentials and for all activities performed under their accounts. Any unauthorized use must be reported immediately.",
  },
  {
    title: "5. Loan Application and Approval",
    body: "Submitting a loan application through PUAC does not guarantee approval. All loan requests are subject to review, verification, and approval by authorized church officers in accordance with church policies.",
  },
  {
    title: "6. Loan Terms, Interest, and Penalties",
    body: "Approved loans are governed by agreed terms, including loan amount, repayment schedule, interest rates, and applicable penalties for late payments. These details are displayed within the system and serve as the official reference.",
  },
  {
    title: "7. Payments and Monitoring",
    body: "Borrowers are responsible for making payments on or before the due dates shown in PUAC. The system provides automated monitoring of balances, payment history, and loan status for reference purposes.",
  },
  {
    title: "8. AI Assistance Disclaimer",
    body: "PUAC may include an AI-powered chatbot (FaithBot) to assist with inquiries related to loan status, payment schedules, and system navigation. The chatbot provides informational support only and does not replace official decisions made by church authorities.",
  },
  {
    title: "9. Prohibited Use",
    body: "Users shall not misuse the system, attempt unauthorized access, manipulate records, or engage in activities that compromise the security or integrity of PUAC.",
  },
  {
    title: "10. Termination of Access",
    body: "The church reserves the right to suspend or terminate access to PUAC for violations of these Terms and Conditions or other valid administrative reasons.",
  },
  {
    title: "11. Limitation of Liability",
    body: "PUAC is provided for administrative support purposes only. The church shall not be held liable for any direct or indirect damages arising from the use or inability to use the system.",
  },
  {
    title: "12. Governing Principles",
    body: "PUAC operates under the principles of faith, integrity, transparency, accountability, and responsible stewardship in alignment with church values.",
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "1. Data Collection",
    body: "PUAC collects personal information such as names, contact details, loan records, payment history, and system usage data necessary for loan management and administrative purposes.",
  },
  {
    title: "2. Use of Information",
    body: "Collected information is used solely to process loan applications, monitor payments, maintain records, provide system support, and improve PUAC services.",
  },
  {
    title: "3. Data Protection and Security",
    body: "PUAC implements reasonable administrative, technical, and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or loss.",
  },
  {
    title: "4. Data Privacy Compliance",
    body: "All personal data is processed in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules and regulations.",
  },
  {
    title: "5. Data Sharing",
    body: "Personal information shall not be shared with third parties except when required by law or authorized by church administration for official purposes.",
  },
  {
    title: "6. User Rights",
    body: "Users have the right to access, correct, and request updates to their personal information in accordance with applicable data privacy laws.",
  },
  {
    title: "7. Data Retention",
    body: "Personal data is retained only for as long as necessary to fulfill the purposes of the system or as required by church policy and applicable laws.",
  },
  {
    title: "8. Changes to the Privacy Policy",
    body: "The church reserves the right to update this Privacy Policy as needed. Users will be informed of significant changes, and continued use of PUAC constitutes acceptance of the updated policy.",
  },
  {
    title: "9. Contact Information",
    body: "For questions or concerns regarding these Terms and Conditions or the Privacy Policy, users may contact the church administration through official communication channels.",
  },
];

const getStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  circleTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0D1F45',
    opacity: 0.05,
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#00C3FF',
    opacity: 0.05,
  },

  // Role selector
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  roleIcon: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },
  roleCardActive: {
    borderColor: '#0D1F45',
    backgroundColor: "rgba(46,107,240,0.06)",
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textMuted,
    marginBottom: 4,
  },
  roleCardTitleActive: {
    color: '#0D1F45',
  },
  roleCardSub: {
    fontSize: 10,
    color: C.textDimmed,
    textAlign: "center",
    lineHeight: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },

  backBtn: { marginBottom: 18, zIndex: 10 },
  backText: { fontSize: 16, fontWeight: '600', color: C.textMuted },

  card: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: 32,
    padding: s(28),
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
    zIndex: 5,
  },

  logo: { width: s(64), height: s(64), alignSelf: "center", marginBottom: 16, borderRadius: 32 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 32, textAlign: "center" },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textDark,
    marginTop: 12,
    marginBottom: 6,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderRadius: 14,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  inputIcon: { width: 18, height: 18, tintColor: '#64748B' },
  input: { flex: 1, fontSize: 15, color: C.textDark, marginLeft: 10 },
  chevron: { fontSize: 15, color: C.textMuted, marginLeft: 6 },

  errorMsg: {
    fontSize: 11.5,
    color: C.errorText,
    marginBottom: 8,
    marginTop: 2,
  },

  hintMsg: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 8,
    marginTop: 2,
    fontStyle: 'italic',
  },

  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfWidth: { flex: 1 },

  genderCardContainer: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: s(8),
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "column",
    gap: 12,
    marginBottom: 4,
  },
  genderRadioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#bbbbbbbc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1937fcff",
  },
  genderRadioText: {
    fontSize: fs(13),
    color: "gray",
    flexShrink: 1,
  },
  genderRadioTextActive: {
    color: "black",
    fontWeight: "600",
  },

  eyeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  eyeIcon: { width: 18, height: 18, tintColor: C.iconColor },

  rulesBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: s(10),
    padding: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 6,
    fontWeight: "500",
  },
  ruleItem: { fontSize: 11.5, color: C.textMuted, marginTop: 3 },
  ruleItemMet: { color: "#10B981" },

  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
    gap: 10,
  },
  strengthBarRow: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: s(4),
    borderWidth: 1.5,
    borderColor: C.checkboxBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: C.checkboxBg, borderColor: C.checkboxBg },
  checkmark: { fontSize: 12, color: "#FFF", fontWeight: "700" },
  termsText: { fontSize: 12, color: C.textMuted, lineHeight: fs(18), flex: 1 },
  termsLink: { color: C.linkBlue, fontWeight: "500" },

  createBtn: {
    backgroundColor: "#0D1F45",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  createBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 12,
    maxHeight: '80%',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalHandle: {
    width: 40,
    height: s(4),
    borderRadius: 2,
    backgroundColor: C.inputBorder,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textDark,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categoryHeader: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.modalDivider,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textDark,
    letterSpacing: 0.5,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  modalItemActive: { backgroundColor: C.modalItemHover },
  modalItemText: { fontSize: 15, color: C.textMuted },
  modalItemTextActive: { color: C.textDark, fontWeight: "500" },
  modalCheck: { fontSize: 16, color: C.btnBlue, fontWeight: "700" },
  modalDivider: {
    height: 1,
    backgroundColor: C.modalDivider,
    marginHorizontal: s(20),
  },

  docSheet: {
    backgroundColor: C.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    height: "85%",
    flexDirection: "column",
  },
  docTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textDark,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  docScroll: { flex: 1, paddingHorizontal: 22 },
  docSection: { marginBottom: 18 },
  docSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textDark,
    marginBottom: 5,
  },
  docSectionBody: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
  docCloseBtn: {
    margin: 16,
    marginBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: C.btnBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  docCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
