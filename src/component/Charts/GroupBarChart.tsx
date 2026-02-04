import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

export type SeriesKey = string;

export type GroupedBarChartDatum = {
  label: string; // e.g. "Jan"
  [key: string]: string | number; // series values e.g. actual, budget, lastYear
};

export type GroupedBarChartSeries = {
  key: SeriesKey;        // e.g. "actual"
  label: string;         // e.g. "Actual"
  color: string;         // e.g. "#2979FF"
};

type Props = {
  data: GroupedBarChartDatum[];
  series: GroupedBarChartSeries[]; // multiple series
  height?: number;                 // chart height (bars area)
  barWidth?: number;
  barGap?: number;                 // gap between bars inside a group
  groupGap?: number;               // gap between groups (months)
  maxValue?: number;               // optional fixed max (else auto)
  showLegend?: boolean;
  showValuesOnTop?: boolean;
  valueFormatter?: (v: number) => string; // e.g. (v)=> `${v/1000}k`
  labelStyle?: any;
};

export default function GroupedBarChart({
  data,
  series,
  height = 200,
  barWidth = 10,
  barGap = 6,
  groupGap = 18,
  maxValue,
  showLegend = true,
  showValuesOnTop = false,
  valueFormatter = (v) => String(v),
  labelStyle,
}: Props) {
  const computedMax = useMemo(() => {
    if (maxValue && maxValue > 0) return maxValue;

    let m = 0;
    for (const row of data) {
      for (const s of series) {
        const v = Number(row[s.key] ?? 0);
        if (!Number.isNaN(v)) m = Math.max(m, v);
      }
    }
    return m || 1;
  }, [data, series, maxValue]);

  return (
    <View style={[styles.card]}>
      <View style={[styles.chartArea, { height }]}>
        <View style={styles.row}>
          {data.map((row, idx) => {
            return (
              <View
                key={`${row.label}-${idx}`}
                style={[
                  styles.group,
                  { marginRight: idx === data.length - 1 ? 0 : groupGap },
                ]}
              >
                <View style={styles.groupBars}>
                  {series.map((s, si) => {
                    const value = Number(row[s.key] ?? 0);
                    const safeValue = Number.isFinite(value) ? value : 0;
                    const barH = (safeValue / computedMax) * height;

                    return (
                      <View key={`${s.key}-${si}`} style={styles.barWrap}>
                        {showValuesOnTop && (
                          <Text style={styles.valueText}>
                            {valueFormatter(safeValue)}
                          </Text>
                        )}

                        <View
                          style={[
                            styles.bar,
                            {
                              width: barWidth,
                              height: Math.max(2, barH),
                              backgroundColor: s.color,
                            },
                          ]}
                        />

                        {/* Gap between bars except last */}
                        {si !== series.length - 1 && (
                          <View style={{ width: barGap }} />
                        )}
                      </View>
                    );
                  })}
                </View>

                <Text style={[styles.xLabel, labelStyle]}>{row.label}</Text>
              </View>
            );
          })}
        </View>

        {/* baseline */}
        <View style={styles.baseline} />
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legendRow}>
          {series.map((s) => (
            <Legend key={s.key} color={s.color} label={s.label} />
          ))}
        </View>
      )}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding:20,
    borderWidth:0.2
  },
  chartArea: {
    justifyContent: "flex-end",
    position: "relative",
    paddingBottom: 26, // space for x-labels
  },
  row: { flexDirection: "row", alignItems: "flex-end" },

  group: { alignItems: "center" },
  groupBars: { flexDirection: "row", alignItems: "flex-end" },

  barWrap: { flexDirection: "row", alignItems: "flex-end" },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },

  valueText: {
    position: "absolute",
    top: -18,
    fontSize: 10,
    opacity: 0.7,
  },

  xLabel: { marginTop: 8, fontSize: 11, opacity: 0.7 },

  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    height: 1,
    backgroundColor: "#E6E8EB",
  },

  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 18,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
});
