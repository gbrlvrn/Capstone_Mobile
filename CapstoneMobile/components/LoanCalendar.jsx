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
    const todayStr = new Date().toDateString();

    const slots = [];
    // Only render slots up to the last day of the month to avoid empty rows at the bottom
    const totalSlots = daysInMonth + firstDay; 
    
    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - firstDay + 1;
      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
      const date = isValidDay ? new Date(y, m, dayNum) : null;
      const dateKey = date ? date.toISOString().split('T')[0] : null;
      const hasNote = dateKey && notes[dateKey];
      const isToday = date && date.toDateString() === todayStr;
      
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

      const hasMarker = activeMarkers.length > 0;
      const markerColor = hasMarker ? activeMarkers[0].color : null;

      slots.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.daySlot, 
            !isValidDay && styles.emptySlot,
          ]}
          onPress={() => isValidDay && onDatePress(date)}
          disabled={!isValidDay}
        >
          {isValidDay && (
            <>
              <View style={[
                styles.dayCircle,
                hasMarker && { backgroundColor: markerColor },
                !hasMarker && hasNote && { backgroundColor: 'rgba(13,31,69,0.1)', borderWidth: 1.5, borderColor: 'rgba(13,31,69,0.25)' },
                !hasMarker && !hasNote && isToday && { backgroundColor: 'rgba(46,107,240,0.12)' },
              ]}>
                <Text style={[
                  styles.dayText, 
                  { color: hasMarker ? '#FFF' : (hasNote || isToday) ? colors.blue : colors.textDark },
                  hasMarker && { fontWeight: '800' },
                ]}>
                  {dayNum}
                </Text>
              </View>
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
        <View style={[styles.legendSwatch, { backgroundColor: '#0D1F45' }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Start</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: '#34C759' }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Payment</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: '#E74C3C' }]} />
        <Text style={[styles.legendText, { color: colors.textMuted }]}>End</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: 'rgba(13,31,69,0.1)', borderWidth: 1.5, borderColor: 'rgba(13,31,69,0.25)' }]} />
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
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  noteIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
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
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default LoanCalendar;
