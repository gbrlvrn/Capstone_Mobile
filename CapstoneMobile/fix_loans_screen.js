const fs = require('fs');
const path = 'c:\\Users\\gabri\\OneDrive\\Desktop\\Capstone_Mobile\\CapstoneMobile\\screens\\LoansScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Imports
const importTarget = 'import ReceiptModal from "../components/ReceiptModal";';
const newImports = `import ReceiptModal from "../components/ReceiptModal";
import LoanCalendar from "../components/LoanCalendar";
import NoteModal from "../components/NoteModal";`;
if (!content.includes('import LoanCalendar')) {
    content = content.replace(importTarget, newImports);
}

// 2. Add State & Logic
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
if (!content.includes('currentCalendarMonth')) {
    content = content.replace(stateTarget, newState);
}

// 3. Fix Render Block (Inserting Calendar before All Loans)
const renderTarget = '{/* All Loans Section */}';
const calendarCode = `        {/* Loan Timeline Calendar */}
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

        {/* All Loans Section */}`;
if (!content.includes('<LoanCalendar')) {
    content = content.replace(renderTarget, calendarCode);
}

// 4. Add NoteModal
const modalTarget = '{/* Loan Receipt Modal */}';
const modalCode = `<NoteModal
        visible={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        date={selectedCalendarDate}
        note={newNoteText}
        onNoteChange={setNewNoteText}
        onSave={handleSaveNote}
        colors={colors}
        saving={savingNote}
      />

      {/* Loan Receipt Modal */}`;
if (!content.includes('<NoteModal')) {
    content = content.replace(modalTarget, modalCode);
}

// 5. Restore corrupted section if any (Safety check for previously failed edit)
content = content.replace(/style=\{\[styles\.summaryIconBg, \{ backgroundColor: item\.iconBg \} \]\}>\s+<Text style=\{\[styles\.sectionTitle/g, `style={[styles.summaryIconBg, { backgroundColor: item.iconBg }]}>
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

        <Text style={[styles.sectionTitle`);

fs.writeFileSync(path, content, 'utf8');
console.log("Fix applied successfully");
