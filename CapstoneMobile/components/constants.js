/**
 * Shared constants — icons, tabs, sidebar items
 * Used by MainLayout and individual screens
 */

export const ICONS = {
  document: require("../assets/icons/document.png"),
  wallet: require("../assets/icons/wallet.png"),
  clock: require("../assets/icons/clock.png"),
  heart: require("../assets/icons/heart.png"),
  chat: require("../assets/icons/chat.png"),
  home: require("../assets/icons/home-v3.png"),
  loans: require("../assets/icons/loans.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  person: require("../assets/icons/person.png"),
  signout: require("../assets/icons/signout.png"),
  notification: require("../assets/icons/bell.png"),
  shield: require("../assets/icons/shield.png"),
  checkCircle: require("../assets/icons/verified.png"),
  lock: require("../assets/icons/lock.png"),
  camera: require("../assets/icons/camera.png"),
  idCard: require("../assets/icons/id-card.png"),
};

export const TAB_ITEMS = [
  { key: "Home", icon: ICONS.home },
  { key: "Loans", icon: ICONS.loans },
  { key: "Donations", icon: ICONS.donations },
  { key: "Attendance", icon: ICONS.attendance },
  { key: "Branches", icon: ICONS.branches },
];

export const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

export const LOGO = require("../assets/puac_logo.png");
