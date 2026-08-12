const fs = require('fs');
const path = 'c:\\Users\\gabri\\OneDrive\\Desktop\\Capstone_Mobile\\CapstoneMobile\\screens\\LoansScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Ensure Imports
if (!content.includes('import LoanCalendar')) {
    content = content.replace('import ReceiptModal from "../components/ReceiptModal";', 
        'import ReceiptModal from "../components/ReceiptModal";\nimport LoanCalendar from "../components/LoanCalendar";\nimport NoteModal from "../components/NoteModal";');
}

// 2. Ensure State & Logic
if (!content.includes('currentCalendarMonth')) {
    const stateTarget = 'const [userEmail, setUserEmail] = useState("");';
    const newState = `const [userEmail, setUserEmail] = useState("");

  // --- Calendar & Notes State ---
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [loanNotes, setLoanNotes] = useState({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      if (!userEmail) return;
      try {
        const saved = await AsyncStorage.getItem("faithly_loan_notes_" + userEmail);
        if (saved) setLoanNotes(JSON.parse(saved));
      } catch (e) { console.log("Load notes error:", e); }
    };
    loadNotes();
  }, [userEmail]);

  const handleSaveNote = async () => {
    if (!selectedCalendarDate) return;
    setSavingNote(true);
    try {
      const dateKey = selectedCalendarDate.toISOString().split('T')[0];
      const updatedNotes = { ...loanNotes, [dateKey]: newNoteText };
      setLoanNotes(updatedNotes);
      if (userEmail) {
        await AsyncStorage.setItem("faithly_loan_notes_" + userEmail, JSON.stringify(updatedNotes));
      }
      setNoteModalOpen(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };`;
    content = content.replace(stateTarget, newState);
}

// 3. Reconstruct Render Block
const startAnchor = '        {!isEligibleForLoan && (';
const endAnchor = '{loan.status === "active" && (';

const goodBlock = `        {/* ✅ Summary Grid */}
        {loanLoading ? (
          <View style={styles.summaryGrid}>
            <SkeletonStatCard style={styles.summaryCardWide} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
          </View>
        ) : (
        <View style={styles.summaryGrid}>
          {summaryData.map((item, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.summaryCard,
                idx === 0 ? styles.summaryCardWide : styles.summaryCardHalf,
                { opacity: summaryAnims[idx].opacity, transform: [{ translateY: summaryAnims[idx].translateY }] },
              ]}
            >
              <View style={styles.summaryLeft}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.summaryValue, { color: colors.textDark }]}>{item.value}</Text>
              </View>
              <View
                style={[styles.summaryIconBg, { backgroundColor: item.iconBg }]}
              >
                <Image
                  source={item.icon}
                  style={[styles.summaryIcon, { tintColor: item.iconColor }]}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          ))}
        </View>
        )}

        {/* Loan Timeline Calendar */}
        <LoanCalendar
          loans={loansData}
          notes={loanNotes}
          onDatePress={(date) => {
            setSelectedCalendarDate(date);
            const dateKey = date.toISOString().split('T')[0];
            setNewNoteText(loanNotes[dateKey] || "");
            setNoteModalOpen(true);
          }}
          colors={colors}
          currentMonth={currentCalendarMonth}
          setCurrentMonth={setCurrentCalendarMonth}
        />

        {/* All Loans Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>All Loans</Text>

          {loansData.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No Loans Yet"
              subtitle="Your loan applications will appear here once you apply."
            />
          ) : (
          loansData.map((loan, idx) => (
            <View key={idx} style={[styles.loanCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* Section label for active loans */}\n              `;

// Finding the range between the eligibility banner end and the middle of the loan card
const bannerEnd = content.indexOf('        )}', content.indexOf(startAnchor));
const loanPropStart = content.indexOf(endAnchor);

if (bannerEnd !== -1 && loanPropStart !== -1) {
    const before = content.substring(0, bannerEnd + 10); // include the )} and newline
    const after = content.substring(loanPropStart);
    content = before + "\n\n" + goodBlock + after;
}

// 4. Ensure NoteModal
if (!content.includes('<NoteModal')) {
    content = content.replace('{/* Loan Receipt Modal */}', `<NoteModal
        visible={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        date={selectedCalendarDate}
        note={newNoteText}
        onNoteChange={setNewNoteText}
        onSave={handleSaveNote}
        colors={colors}
        saving={savingNote}
      />\n\n      {/* Loan Receipt Modal */}`);
}

fs.writeFileSync(path, content, 'utf8');
console.log("Deep fix applied successfully");
