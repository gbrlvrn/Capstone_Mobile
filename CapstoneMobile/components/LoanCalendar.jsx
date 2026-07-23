import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LoanCalendar = ({ loans, notes, onDatePress, colors, currentMonth, setCurrentMonth }) => {
  const years = [];
  const startYear = new Date().getFullYear() - 1;
  for (let i = 0; i < 3; i++) years.push(startYear + i);

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();

  const renderHeader = () => {
    const monthName = currentMonth.toLocaleString('default', { month: 'long' });
    const year = currentMonth.getFullYear();

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          const newDate = new Date(currentMonth);
          newDate.setMonth(newDate.getMonth() - 1);
          setCurrentMonth(newDate);
        }} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.blue }]}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textDark }]}>{`${monthName} ${year}`}</Text>
        <TouchableOpacity onPress={() => {
          const newDate = new Date(currentMonth);
          newDate.setMonth(newDate.getMonth() + 1);
          setCurrentMonth(newDate);
        }} style={styles.navBtn}>
          <Text style={[styles.navText, { color: colors.blue }]}>{">"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={styles.daysOfWeek}>
        {days.map(d => (
          <Text key={d} style={[styles.dayOfWeekText, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>
    );
  };

  const renderCalendar = () => {
    const m = currentMonth.getMonth();
    const y = currentMonth.getFullYear();
    const daysInMonth = getDaysInMonth(m, y);
    const firstDay = getFirstDayOfMonth(m, y);

    const slots = [];
    // Only render slots up to the last day of the month to avoid empty rows at the bottom
    const totalSlots = daysInMonth + firstDay; 
    
    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - firstDay + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      const date = isValidDay ? new Date(y, m, dayNum) : null;
      const dateKey = date ? date.toISOString().split('T')[0] : null;
      const hasNote = dateKey && notes[dateKey];
      
      // Loan markers logic
      const activeMarkers = [];
      if (date) {
        loans.forEach(loan => {
          if (!loan.applied || loan.status !== 'active') return;
          const start = new Date(loan.applied);
          const end = new Date(start);
          end.setMonth(end.getMonth() + (loan.termMonths || 0));

          if (date.toDateString() === start.toDateString()) activeMarkers.push({ type: 'start', color: '#0D1F45' });
          if (date.toDateString() === end.toDateString()) activeMarkers.push({ type: 'end', color: '#E74C3C' });
          
          // Payment markers (monthly)
          for (let month = 1; month <= (loan.termMonths || 0); month++) {
            const payDate = new Date(start);
            payDate.setMonth(payDate.getMonth() + month);
            if (date.toDateString() === payDate.toDateString()) activeMarkers.push({ type: 'payment', color: '#34C759' });
          }
        });
      }

      slots.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.daySlot, 
            !isValidDay && styles.emptySlot,
            isValidDay && activeMarkers.length > 0 && { backgroundColor: activeMarkers[0].color, borderRadius: 10 }
          ]}
          onPress={() => isValidDay && onDatePress(date)}
          disabled={!isValidDay}
        >
          {isValidDay && (
            <>
              <Text style={[
                styles.dayText, 
                { color: activeMarkers.length > 0 ? "#FFF" : colors.textDark }
              ]}>
                {dayNum}
              </Text>
              {hasNote && (
                <View style={[
                  styles.noteIndicator, 
                  { backgroundColor: activeMarkers.length > 0 ? "#FFF" : colors.blue }
                ]} />
              )}
            </>
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.calendarGrid}>{slots}</View>;
  };

  const renderLegend = () => (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#0D1F45', borderRadius: 4 }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Start</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#34C759', borderRadius: 4 }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Payment</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: '#E74C3C', borderRadius: 4 }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>End</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.blue, borderRadius: 2 }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Note</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.textDark }]}>Loan Timeline</Text>
      {renderHeader()}
      {renderDaysOfWeek()}
      {renderCalendar()}
      {renderLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: "#64748B",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 60,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,107,240,0.05)',
  },
  navText: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayOfWeekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  daySlot: {
    width: '14.28%',
    height: 38, // Fixed tight height
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  emptySlot: {
    opacity: 0,
  },
  dayText: {
    fontSize: 16, // Massive dates as requested
    fontWeight: '700',
    letterSpacing: -1,
  },
  noteIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default LoanCalendar;
