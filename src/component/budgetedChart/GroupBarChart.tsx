import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

export type SeriesKey = string;

export type GroupedBarChartDatum = {
  label: string;
  [key: string]: string | number;
};

export type GroupedBarChartSeries = {
  key: SeriesKey;
  label: string;
  color: string;
};

type Props = {
  data: GroupedBarChartDatum[];
  series: GroupedBarChartSeries[];
  height?: number;
  barWidth?: number;
  barGap?: number;
  groupGap?: number;
  maxValue?: number;
  showLegend?: boolean;
  showValuesOnTop?: boolean;
  valueFormatter?: (v: number) => string;
  labelStyle?: any;

  showYAxis?: boolean;
  yTicks?: number;
  yAxisFormatter?: (v: number) => string;
  yAxisOffset?: number;
};

const X_LABEL_SPACE = 26;

const defaultAxisFormatter = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
};

export default function GroupedBarChart2({
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

  showYAxis = true,
  yTicks = 8,
  yAxisFormatter = defaultAxisFormatter,

  yAxisOffset = 0,
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

  const barAreaHeight = Math.max(1, height - X_LABEL_SPACE);

  const yValues = useMemo(() => {
    const steps = Math.max(1, yTicks);
    const out: number[] = [];
    for (let i = 0; i <= steps; i++) out.push((computedMax / steps) * i);
    return out;
  }, [computedMax, yTicks]);

  const groupBarsWidth =
    series.length * barWidth + (series.length - 1) * barGap;

  // ✅ FIX: label ko fit karne ke liye minimum width
  const MIN_GROUP_WIDTH = 32; // Jan/Feb/Mar easily fit
  const groupWidth = Math.max(groupBarsWidth, MIN_GROUP_WIDTH);

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        {showYAxis && (
          <View
            style={[
              styles.yAxis,
              { height: barAreaHeight, transform: [{ translateY: yAxisOffset }] },
            ]}
          >
            {yValues
              .slice()
              .reverse()
              .map((v, i) => (
                <View
                  key={`${v}-${i}`}
                  style={[styles.yTickRow, { height: barAreaHeight / yTicks }]}
                >
                  <Text style={styles.yTickText}>{yAxisFormatter(v)}</Text>
                </View>
              ))}
          </View>
        )}

        <View style={[styles.chartArea, { height }]}>
          {showYAxis &&
            yValues
              .slice()
              .reverse()
              .map((_, i) => (
                <View
                  key={`grid-${i}`}
                  style={[
                    styles.gridLine,
                    { bottom: X_LABEL_SPACE + (barAreaHeight / yTicks) * i },
                  ]}
                />
              ))}

          <View style={styles.row}>
            {data.map((row, idx) => (
              <View
                key={`${row.label}-${idx}`}
                style={[
                  styles.group,
                  { width: groupWidth, marginRight: idx === data.length - 1 ? 0 : groupGap },
                ]}
              >
                <View style={[styles.groupBars, { height: barAreaHeight }]}>
                  {series.map((s, si) => {
                    const value = Number(row[s.key] ?? 0);
                    const safeValue = Number.isFinite(value) ? value : 0;
                    const barH = (safeValue / computedMax) * barAreaHeight;

                    return (
                      <View key={`${s.key}-${si}`} style={styles.barWrap}>
                        {showValuesOnTop && (
                          <Text style={styles.valueText}>{valueFormatter(safeValue)}</Text>
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

                        {si !== series.length - 1 && <View style={{ width: barGap }} />}
                      </View>
                    );
                  })}
                </View>

                {/* ✅ FIX: truncate off, show full month */}
                <View style={[styles.xLabelRow, { height: X_LABEL_SPACE }]}>
                  <Text
                    style={[styles.xLabel, labelStyle]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {row.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.baseline, { bottom: X_LABEL_SPACE }]} />
        </View>
      </View>

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
    padding: 5,
    borderWidth: 0.2,
    paddingTop: 40,
  },
  mainRow: { flexDirection: "row", alignItems: "flex-end" },

  yAxis: { width: 20, marginRight: 10, justifyContent: "space-between" },
  yTickRow: { justifyContent: "center" },
  yTickText: { fontSize: 8, opacity: 0.7, textAlign: "right" },

  chartArea: { flex: 1, justifyContent: "flex-end", position: "relative" },

  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#E6E8EB",
    opacity: 0.6,
  },

  row: { flexDirection: "row", alignItems: "flex-end" },
  group: { alignItems: "center" },

  groupBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },

  barWrap: { flexDirection: "row", alignItems: "flex-end" },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },

  valueText: { position: "absolute", top: -20, fontSize: 8, opacity: 0.7 },

  xLabelRow: { justifyContent: "center", alignItems: "center" },
  xLabel: { fontSize: 9, opacity: 0.7 }, // ✅ little bigger

  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
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
