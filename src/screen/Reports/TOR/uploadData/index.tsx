
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import CustomHeader from "../../../../component/customHeader";
import { Colors } from "../../../../themes/color";
import Container from "../../../../ui/useLayout";

const API_URL = "https://financesystemawh-rtjt.onrender.com/api/tenant";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const emptyForm = {
  tenantName: "",
  percentage: "",
  baseRent: "",
  totalRevenue: "",
  month: "",
  year: String(new Date().getFullYear()),
};

export default function AddTOR({ navigation }) {
  const [rows, setRows]                       = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [modalVisible, setModalVisible]       = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [editingId, setEditingId]             = useState(null);
  const [form, setForm]                       = useState(emptyForm);
  const [showMonthDrop, setShowMonthDrop]     = useState(false);
  const [filterYear, setFilterYear]           = useState('');
  const [filterTenant, setFilterTenant]       = useState('');
  const [tenantSuggestions, setTenantSuggestions] = useState([]);

  const isEditing = Boolean(editingId);

  // ── Existing tenant names for suggestions ──────────────────
  const existingTenants = useMemo(() => {
    return [...new Set(rows.map(r => r.tenantName).filter(Boolean))];
  }, [rows]);

  // ── Auto-calculate TOR ─────────────────────────────────────
  const calculatedTOR = useMemo(() => {
    const rev  = parseFloat(form.totalRevenue) || 0;
    const pct  = parseFloat(form.percentage)   || 0;
    const base = parseFloat(form.baseRent)     || 0;
    return (rev * pct) / 100 - base;
  }, [form.totalRevenue, form.percentage, form.baseRent]);

  // ── Filter rows ────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter(item => {
      const matchYear   = filterYear   ? String(item.year).includes(filterYear)                              : true;
      const matchTenant = filterTenant ? item.tenantName?.toLowerCase().includes(filterTenant.toLowerCase()) : true;
      return matchYear && matchTenant;
    });
  }, [rows, filterYear, filterTenant]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const res  = await fetch(API_URL);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setRows(json.data || []);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm, year: String(new Date().getFullYear()) });
    setTenantSuggestions([]);
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      tenantName:   String(item.tenantName   ?? ""),
      percentage:   String(item.percentage   ?? ""),
      baseRent:     String(item.baseRent     ?? ""),
      totalRevenue: String(item.totalRevenue ?? ""),
      month:        String(item.month        ?? ""),
      year:         String(item.year         ?? ""),
    });
    setTenantSuggestions([]);
    setModalVisible(true);
  }

  function setField(key, value) {
    setForm(p => ({ ...p, [key]: value }));
  }

  // ── Tenant name change with suggestions ────────────────────
  function onTenantChange(v) {
    setField("tenantName", v);
    if (v.trim().length > 0) {
      const filtered = existingTenants.filter(t =>
        t.toLowerCase().includes(v.toLowerCase())
      );
      setTenantSuggestions(filtered);
    } else {
      setTenantSuggestions([]);
    }
  }

  function validate() {
    if (!form.tenantName.trim()) return "Tenant Name is required";
    if (!form.month)             return "Please select a Month";
    if (!form.year)              return "Year is required";
    if (!form.percentage)        return "Percentage is required";
    if (!form.baseRent)          return "Base Rent is required";
    if (!form.totalRevenue)      return "Total Revenue is required";
    return null;
  }

  async function save() {
    const err = validate();
    if (err) return Alert.alert("Validation", err);

    const payload = {
      tenantName:   form.tenantName.trim(),
      percentage:   parseFloat(form.percentage),
      baseRent:     parseFloat(form.baseRent),
      totalRevenue: parseFloat(form.totalRevenue),
      tor:          calculatedTOR,
      month:        form.month,
      year:         parseInt(form.year),
    };

    try {
      setSaving(true);
      const url    = isEditing ? `${API_URL}/${editingId}` : API_URL;
      const method = isEditing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setModalVisible(false);
      await loadAll();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    Alert.alert("Confirm", "Delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const res  = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Delete failed");
            await loadAll();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }

  // ── TABLE ROW ───────────────────────────────────────────────
  const RowItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.tableRow, { backgroundColor: isEven ? "#fff" : "#F8F9FA" }]}>
        <Text style={[styles.cell, styles.colName]}  numberOfLines={1}>{item.tenantName}</Text>
        <Text style={[styles.cell, styles.colMonth]} numberOfLines={1}>{item.month}</Text>
        <Text style={[styles.cell, styles.colYear]}  numberOfLines={1}>{item.year}</Text>
        <Text style={[styles.cell, styles.colPct]}   numberOfLines={1}>{item.percentage}%</Text>
        <Text style={[styles.cell, styles.colBase]}  numberOfLines={1}>{Number(item.baseRent).toLocaleString()}</Text>
        <Text style={[styles.cell, styles.colRev]}   numberOfLines={1}>{Number(item.totalRevenue).toLocaleString()}</Text>
        <Text style={[styles.cell, styles.colTor, { color: item.tor >= 0 ? '#16A34A' : '#DC2626' }]} numberOfLines={1}>
          {Number(item.tor).toLocaleString()}
        </Text>
        <View style={[styles.cell, styles.colActions, { flexDirection: "row", gap: 6 }]}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={() => remove(item._id)}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── RENDER ──────────────────────────────────────────────────
  return (
       <SafeAreaView style={{ flex: 1, backgroundColor: Colors.PrimaryColor}}>
          <StatusBar backgroundColor={Colors.PrimaryColor}  barStyle={'light-content'} translucent={false} hidden={false} />
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* HEADER */}
        <View style={styles.header}>
          <CustomHeader title="Back" />
          <View style={styles.actionsWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search tenant..."
              placeholderTextColor="#999"
              value={filterTenant}
              onChangeText={setFilterTenant}
            />
            <TextInput
              style={[styles.searchInput, { width: 80 }]}
              placeholder="Year"
              placeholderTextColor="#999"
              value={filterYear}
              onChangeText={setFilterYear}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Text style={styles.addBtnText}>+ Add TOR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABLE — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.cell, styles.colName,    styles.hCell]}>Tenant</Text>
              <Text style={[styles.cell, styles.colMonth,   styles.hCell]}>Month</Text>
              <Text style={[styles.cell, styles.colYear,    styles.hCell]}>Year</Text>
              <Text style={[styles.cell, styles.colPct,     styles.hCell]}>%</Text>
              <Text style={[styles.cell, styles.colBase,    styles.hCell]}>Base Rent</Text>
              <Text style={[styles.cell, styles.colRev,     styles.hCell]}>Revenue</Text>
              <Text style={[styles.cell, styles.colTor,     styles.hCell]}>TOR</Text>
              <Text style={[styles.cell, styles.colActions, styles.hCell]}>Actions</Text>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.PrimaryColor} />
                <Text style={{ marginTop: 8, color: "#999" }}>Loading...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredRows}
                keyExtractor={item => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => <RowItem item={item} index={index} />}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Text style={{ color: "#aaa" }}>No records found.</Text>
                  </View>
                }
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </View>
        </ScrollView>

        {/* MODAL */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modalCard}>

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit TOR" : "Add New TOR"}
                </Text>
                <TouchableOpacity onPress={() => !saving && setModalVisible(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
              >

                {/* Tenant Name with suggestions */}
                <Field label="Tenant Name *">
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={styles.input}
                      value={form.tenantName}
                      onChangeText={onTenantChange}
                      placeholder="e.g. Sasso"
                    />
                    {tenantSuggestions.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {tenantSuggestions.map((name, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.suggestionItem,
                              i === tenantSuggestions.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              setField("tenantName", name);
                              setTenantSuggestions([]);
                            }}
                          >
                            <Text style={styles.suggestionText}>{name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </Field>

                {/* Month + Year */}
                <View style={styles.formRow}>
                  <Field label="Month *">
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: "center" }]}
                      onPress={() => setShowMonthDrop(!showMonthDrop)}
                    >
                      <Text style={{ color: form.month ? "#000" : "#aaa", fontSize: 14 }}>
                        {form.month || "Select month"}
                      </Text>
                    </TouchableOpacity>
                    {showMonthDrop && (
                      <View style={styles.monthDrop}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {MONTHS.map(m => (
                            <TouchableOpacity
                              key={m}
                              style={[styles.monthItem, form.month === m && { backgroundColor: "#EAF4FB" }]}
                              onPress={() => { setField("month", m); setShowMonthDrop(false); }}
                            >
                              <Text style={[{ fontSize: 13 }, form.month === m && { color: Colors.PrimaryColor, fontWeight: "700" }]}>
                                {m}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </Field>

                  <Field label="Year *">
                    <TextInput
                      style={styles.input}
                      value={form.year}
                      onChangeText={v => setField("year", v)}
                      keyboardType="number-pad"
                      placeholder="e.g. 2026"
                    />
                  </Field>
                </View>

                {/* Percentage + Base Rent */}
                <View style={styles.formRow}>
                  <Field label="Percentage (%) *">
                    <TextInput
                      style={styles.input}
                      value={form.percentage}
                      onChangeText={v => setField("percentage", v)}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 17"
                    />
                  </Field>
                  <Field label="Base Rent *">
                    <TextInput
                      style={styles.input}
                      value={form.baseRent}
                      onChangeText={v => setField("baseRent", v)}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 97500"
                    />
                  </Field>
                </View>

                {/* Total Revenue */}
                <Field label="Total Revenue *">
                  <TextInput
                    style={styles.input}
                    value={form.totalRevenue}
                    onChangeText={v => setField("totalRevenue", v)}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 1515020"
                  />
                </Field>

                {/* TOR Preview */}
                <View style={styles.torPreview}>
                  <Text style={styles.torLabel}>
                    TOR = (Revenue × %) / 100 − Base Rent
                  </Text>
                  <Text style={[styles.torValue, { color: calculatedTOR >= 0 ? "#16A34A" : "#DC2626" }]}>
                    {calculatedTOR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={save}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Saving..." : isEditing ? "Update" : "Create"}
                  </Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
      </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ flex: 1, marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,

    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  actionsWrap: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    height: 36,
    width: 300,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    backgroundColor: "#ffffff",
    color: "#000",
  },
  addBtn:     { backgroundColor: Colors.PrimaryColor, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  center:     { alignItems: "center", justifyContent: "center", paddingVertical: 40 },

  // Table
  tableHeaderRow: { backgroundColor: Colors.PrimaryColor },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
    alignItems: "center",
  },
  cell:       { fontSize: 13, paddingHorizontal: 10 },
  hCell:      { color: "#fff", fontWeight: "700" },
  colName:    { width: 170 },
  colMonth:   { width: 140 },
  colYear:    { width: 140 },
  colPct:     { width: 140 },
  colBase:    { width: 150 },
  colRev:     { width: 150 },
  colTor:     { width: 150, fontWeight: "700" },
  colActions: { width: 160 },

  editBtn: { backgroundColor: Colors.PrimaryColor, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 6 },
  delBtn:  { backgroundColor: "#DC2626",           paddingVertical: 5, paddingHorizontal: 14, borderRadius: 6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 11 },

  // Modal
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  closeText:  { fontSize: 20, fontWeight: "800", color: "#555" },

  formRow:    { flexDirection: "row", gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },

  // Suggestions
  suggestionBox: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    zIndex: 9999,
    elevation: 8,
    maxHeight: 160,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },

  monthDrop: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    zIndex: 9999,
    elevation: 8,
  },
  monthItem: { padding: 12, borderBottomWidth: 0.5, borderColor: "#f0f0f0" },

  torPreview: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  torLabel: { fontSize: 12, color: "#555", marginBottom: 6 },
  torValue: { fontSize: 22, fontWeight: "800" },

  saveBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});






// cell:       { fontSize: 13, paddingHorizontal: 10 },
// hCell:      { color: "#fff", fontWeight: "700" },
// colName:    { width: 170 },
// colMonth:   { width: 140 },
// colYear:    { width: 140  },
// colPct:     { width: 140  },
// colBase:    { width: 150 },
// colRev:     { width: 150 },
// colTor:     { width: 150, fontWeight: "700" },
// colActions: { width: 160 },