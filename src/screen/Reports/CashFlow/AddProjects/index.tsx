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

const API_BASE = "https://financesystemawh-rtjt.onrender.com";
const ENDPOINT = `${API_BASE}/ProjectsTrailBalance`;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const emptyForm = {
  month: "",
  year: String(new Date().getFullYear()),
  typeR: "P",
  accountType: "Revenue",
  budgetedAmount: "",
  balanceFirst: "",
  company: "",
  component: "",
  accountno: "",
  auxcode: "",
  cc2: "",
  cc3: "",
};

export default function AddProjects({ navigation }) {
  const [rows, setRows]                         = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [modalVisible, setModalVisible]         = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [editingId, setEditingId]               = useState(null);
  const [form, setForm]                         = useState(emptyForm);
  const [filterYear, setFilterYear]             = useState('');
  const [filterMonth, setFilterMonth]           = useState('');
  const [showMonthDrop, setShowMonthDrop]       = useState(false);
  const [showAccountTypeDrop, setShowAccountTypeDrop] = useState(false);
  const [companySuggestions, setCompanySuggestions]   = useState([]);
  const [showCompanySug, setShowCompanySug]     = useState(false);

  const isEditing = Boolean(editingId);

  const existingCompanies = useMemo(() =>
    [...new Set(rows.map(r => r.company).filter(Boolean))],
  [rows]);

  const filteredRows = useMemo(() =>
    rows.filter(item => {
      const matchYear  = filterYear  ? String(item.year).includes(filterYear)   : true;
      const matchMonth = filterMonth ? String(item.month).includes(filterMonth) : true;
      return matchYear && matchMonth;
    }),
  [rows, filterYear, filterMonth]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const res  = await fetch(ENDPOINT);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load data");
      const sorted = [...(data || [])].sort((a, b) => {
        const by = Number(b.year) || 0;
        const ay = Number(a.year) || 0;
        if (by !== ay) return by - ay;
        return (Number(b.month) || 0) - (Number(a.month) || 0);
      });
      setRows(sorted);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm({ ...emptyForm, year: String(new Date().getFullYear()) });
    setShowMonthDrop(false);
    setShowAccountTypeDrop(false);
    setShowCompanySug(false);
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      month:          String(item.month          ?? ""),
      year:           String(item.year           ?? ""),
      typeR:          String(item.typeR          ?? "P"),
      accountType:    String(item.accountType    ?? "Revenue"),
      budgetedAmount: String(item.budgetedAmount ?? ""),
      balanceFirst:   String(item.balanceFirst   ?? ""),
      company:        String(item.company        ?? ""),
      component:      String(item.component      ?? ""),
      accountno:      String(item.accountno      ?? ""),
      auxcode:        String(item.auxcode        ?? ""),
      cc2:            String(item.cc2            ?? ""),
      cc3:            String(item.cc3            ?? ""),
    });
    setShowMonthDrop(false);
    setShowAccountTypeDrop(false);
    setShowCompanySug(false);
    setModalVisible(true);
  }

  function setField(key, value) {
    setForm(p => ({ ...p, [key]: value }));
  }

  function onCompanyChange(v) {
    setField("company", v);
    if (v.trim().length > 0) {
      setShowCompanySug(true);
    } else {
      setShowCompanySug(false);
    }
  }

  function validateForm() {
    const month = Number(form.month);
    const year  = Number(form.year);
    if (!Number.isFinite(month) || month < 1 || month > 12) return "Month must be between 1 and 12";
    if (!Number.isFinite(year)  || year < 2000 || year > 2100) return "Year looks invalid";
    if (form.accountType !== "Revenue" && form.accountType !== "Cost") return 'accountType must be "Revenue" or "Cost"';
    return null;
  }

  async function save() {
    const err = validateForm();
    if (err) return Alert.alert("Validation", err);

    const payload = {
      month:          Number(form.month),
      year:           Number(form.year),
      typeR:          String(form.typeR || "P"),
      accountType:    form.accountType,
      budgetedAmount: Number(form.budgetedAmount || 0),
      balanceFirst:   Number(form.balanceFirst   || 0),
      company:        String(form.company    || "others"),
      component:      String(form.component  || ""),
      accountno:      String(form.accountno  || ""),
      auxcode:        String(form.auxcode    || ""),
      cc2:            String(form.cc2        || ""),
      cc3:            String(form.cc3        || ""),
    };

    try {
      setSaving(true);
      const url    = isEditing ? `${ENDPOINT}/${editingId}` : ENDPOINT;
      const method = isEditing ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setModalVisible(false);
      await loadAll();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    Alert.alert("Confirm", "Delete this row?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const res  = await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Delete failed");
            await loadAll();
          } catch (e) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  }

  const filteredCompanySug = existingCompanies.filter(c =>
    c.toLowerCase().includes((form.company || "").toLowerCase())
  );

  const monthName = (m) => MONTHS[Number(m) - 1] || m;

  // ── TABLE ROW ───────────────────────────────────────────────
  const RowItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    return (
      <View style={[styles.tableRow, { backgroundColor: isEven ? "#fff" : "#F8F9FA" }]}>
        <Text style={[styles.cell, styles.colComp]}     numberOfLines={1}>{item.component || ""}</Text>
        <Text style={[styles.cell, styles.colMonth]}    numberOfLines={1}>{monthName(item.month)}</Text>
        <Text style={[styles.cell, styles.colYear]}     numberOfLines={1}>{item.year}</Text>
        <Text style={[styles.cell, styles.colType]}     numberOfLines={1}>{item.accountType}</Text>
        <Text style={[styles.cell, styles.colBudgeted]} numberOfLines={1}>
          {Number(item.budgetedAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text style={[styles.cell, styles.colActual]}   numberOfLines={1}>
          {Number(item.balanceFirst || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
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
    <>
      <StatusBar backgroundColor={Colors.PrimaryColor} barStyle="light-content" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>

        {/* HEADER */}
        <View style={styles.header}>
          <CustomHeader title="Back" />
          <View style={styles.actionsWrap}>

            <TextInput
              style={[styles.searchInput, { width: 80 }]}
              placeholder="Month"
              placeholderTextColor="#999"
              value={filterMonth}
              onChangeText={setFilterMonth}
              keyboardType="number-pad"
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
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* TABLE — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>

            {/* TABLE HEADER */}
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.cell, styles.colComp,     styles.hCell]}>Component</Text>
              <Text style={[styles.cell, styles.colMonth,    styles.hCell]}>Month</Text>
              <Text style={[styles.cell, styles.colYear,     styles.hCell]}>Year</Text>
              <Text style={[styles.cell, styles.colType,     styles.hCell]}>Type</Text> 
              <Text style={[styles.cell, styles.colBudgeted, styles.hCell]}>Budgeted</Text>
              <Text style={[styles.cell, styles.colActual,   styles.hCell]}>Actual</Text>
              <Text style={[styles.cell, styles.colActions,  styles.hCell]}>Actions</Text>
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
                  {isEditing ? "Edit Row" : "Add New Row"}
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

                {/* Month + Year */}
                <View style={styles.formRow}>
                  <Field label="Month *">
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: "center" }]}
                      onPress={() => setShowMonthDrop(!showMonthDrop)}
                    >
                      <Text style={{ color: form.month ? "#000" : "#aaa", fontSize: 14 }}>
                        {form.month ? monthName(form.month) : "Select month"}
                      </Text>
                    </TouchableOpacity>
                    {showMonthDrop && (
                      <View style={styles.suggestionBox}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {MONTHS.map((m, i) => (
                            <TouchableOpacity
                              key={m}
                              style={[
                                styles.suggestionItem,
                                String(i + 1) === form.month && { backgroundColor: "#EAF4FB" }
                              ]}
                              onPress={() => {
                                setField("month", String(i + 1));
                                setShowMonthDrop(false);
                              }}
                            >
                              <Text style={[
                                styles.suggestionText,
                                String(i + 1) === form.month && { color: Colors.PrimaryColor, fontWeight: "700" }
                              ]}>
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

                {/* Account Type + TypeR */}
                <View style={styles.formRow}>
                  <Field label="Account Type *">
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: "center" }]}
                      onPress={() => setShowAccountTypeDrop(!showAccountTypeDrop)}
                    >
                      <Text style={{ color: form.accountType ? "#000" : "#aaa", fontSize: 14 }}>
                        {form.accountType || "Select type"}
                      </Text>
                    </TouchableOpacity>
                    {showAccountTypeDrop && (
                      <View style={styles.suggestionBox}>
                        {["Revenue", "Cost"].map((type, i) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.suggestionItem,
                              form.accountType === type && { backgroundColor: "#EAF4FB" },
                              i === 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              setField("accountType", type);
                              setShowAccountTypeDrop(false);
                            }}
                          >
                            <Text style={[
                              styles.suggestionText,
                              form.accountType === type && { color: Colors.PrimaryColor, fontWeight: "700" }
                            ]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </Field>

                  <Field label="Type R">
                    <TextInput
                      style={styles.input}
                      value={form.typeR}
                      onChangeText={v => setField("typeR", v)}
                      placeholder="P"
                    />
                  </Field>
                </View>

                {/* Company with suggestions */}
                <Field label="Company">
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={styles.input}
                      value={form.company}
                      onChangeText={onCompanyChange}
                      placeholder="e.g. West Walk Real Estate"
                    />
                    {showCompanySug && filteredCompanySug.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {filteredCompanySug.slice(0, 6).map((name, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.suggestionItem,
                              i === filteredCompanySug.length - 1 && { borderBottomWidth: 0 }
                            ]}
                            onPress={() => {
                              setField("company", name);
                              setShowCompanySug(false);
                            }}
                          >
                            <Text style={styles.suggestionText}>{name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </Field>

                {/* Component */}
                <Field label="Component">
                  <TextInput
                    style={styles.input}
                    value={form.component}
                    onChangeText={v => setField("component", v)}
                    placeholder="e.g. Tenant Variation Request"
                  />
                </Field>

                {/* Account No + Aux Code */}
                <View style={styles.formRow}>
                  <Field label="Account No">
                    <TextInput
                      style={styles.input}
                      value={form.accountno}
                      onChangeText={v => setField("accountno", v)}
                      placeholder="44104"
                      keyboardType="number-pad"
                    />
                  </Field>
                  <Field label="Aux Code">
                    <TextInput
                      style={styles.input}
                      value={form.auxcode}
                      onChangeText={v => setField("auxcode", v)}
                      placeholder=""
                    />
                  </Field>
                </View>

                {/* CC2 + CC3 */}
                <View style={styles.formRow}>
                  <Field label="CC2">
                    <TextInput
                      style={styles.input}
                      value={form.cc2}
                      onChangeText={v => setField("cc2", v)}
                      placeholder=""
                    />
                  </Field>
                  <Field label="CC3">
                    <TextInput
                      style={styles.input}
                      value={form.cc3}
                      onChangeText={v => setField("cc3", v)}
                      placeholder=""
                    />
                  </Field>
                </View>

                {/* Budgeted + Balance */}
                <View style={styles.formRow}>
                  <Field label="Budgeted Amount">
                    <TextInput
                      style={styles.input}
                      value={form.budgetedAmount}
                      onChangeText={v => setField("budgetedAmount", v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Balance First">
                    <TextInput
                      style={styles.input}
                      value={form.balanceFirst}
                      onChangeText={v => setField("balanceFirst", v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                  </Field>
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

      </SafeAreaView>
    </>
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
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },
  actionsWrap: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    height: 36,
    width: 140,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    backgroundColor: "#f9f9f9",
    color: "#000",
  },
  addBtn:     { backgroundColor: Colors.PrimaryColor, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
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
  cell:        { fontSize: 13, paddingHorizontal: 10 },
  hCell:       { color: "#fff", fontWeight: "700" },
  colComp:     { width: 260 },
  colMonth:    { width: 160 },
  colYear:     { width: 140 },
  colType:     { width: 140 },
  colBudgeted: { width: 140 },
  colActual:   { width: 160 },
  colActions:  { width: 200 },

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
    maxHeight: "92%",
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

  // Suggestions / Dropdowns
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
    maxHeight: 200,
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

  saveBtn: {
    backgroundColor: Colors.PrimaryColor,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

// // ProjectsTrailBalanceScreen.js
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Modal,
//   TextInput,
//   FlatList,
//   Alert,
//   ActivityIndicator,
//   Platform,
//   KeyboardAvoidingView,
//   ScrollView,
// } from "react-native";
// import CustomHeader from "../../../../component/customHeader";
// import Container from "../../../../ui/useLayout";
// import { Colors } from "../../../../themes/color";


// const API_BASE = "https://financesystemawh-rtjt.onrender.com"


// const ENDPOINT = `${API_BASE}/ProjectsTrailBalance`;

// const emptyForm = {
//   month: "",
//   year: "",
//   typeR: "P",
//   accountType: "Revenue", // must be "Revenue" or "Cost"
//   budgetedAmount: "0",
//   balanceFirst: "0",
//   company: "",
//   component: "",
//   accountno: "",
//   auxcode: "",
//   cc2: "",
//   cc3: "",
// };

// export default function AddProjects() {
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [editingId, setEditingId] = useState(null);
//   const [form, setForm] = useState(emptyForm);

//   const isEditing = useMemo(() => Boolean(editingId), [editingId]);

//   useEffect(() => {
//     loadAll();
//   }, []);

//   async function loadAll() {
//     try {
//       setLoading(true);
//       const res = await fetch(ENDPOINT);
//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Failed to load data");
//       // sort newest first (year/month)
//       const sorted = [...(data || [])].sort((a, b) => {
//         const ay = Number(a.year) || 0;
//         const by = Number(b.year) || 0;
//         if (by !== ay) return by - ay;
//         const am = Number(a.month) || 0;
//         const bm = Number(b.month) || 0;
//         return bm - am;
//       });
//       setRows(sorted);
//     } catch (e) {
//       Alert.alert("Error", e.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function openAddModal() {
//     setEditingId(null);
//     setForm({
//       ...emptyForm,
//       // small helpful defaults
//       month: String(new Date().getMonth() + 1),
//       year: String(new Date().getFullYear()),
//     });
//     setModalVisible(true);
//   }

//   function openEditModal(item) {
//     setEditingId(item._id);
//     setForm({
//       month: String(item.month ?? ""),
//       year: String(item.year ?? ""),
//       typeR: String(item.typeR ?? "P"),
//       accountType: String(item.accountType ?? "Revenue"),
//       budgetedAmount: String(item.budgetedAmount ?? 0),
//       balanceFirst: String(item.balanceFirst ?? 0),
//       company: String(item.company ?? ""),
//       component: String(item.component ?? ""),
//       accountno: String(item.accountno ?? ""),
//       auxcode: String(item.auxcode ?? ""),
//       cc2: String(item.cc2 ?? ""),
//       cc3: String(item.cc3 ?? ""),
//     });
//     setModalVisible(true);
//   }

//   function closeModal() {
//     if (saving) return;
//     setModalVisible(false);
//   }

//   function setField(key, value) {
//     setForm((p) => ({ ...p, [key]: value }));
//   }

//   function validateForm() {
//     const month = Number(form.month);
//     const year = Number(form.year);
//     if (!Number.isFinite(month) || month < 1 || month > 12) {
//       return "Month must be between 1 and 12";
//     }
//     if (!Number.isFinite(year) || year < 2000 || year > 2100) {
//       return "Year looks invalid";
//     }
//     const at = String(form.accountType || "");
//     if (at !== "Revenue" && at !== "Cost") {
//       return 'accountType must be "Revenue" or "Cost"';
//     }
//     return null;
//   }

//   function buildPayload() {
//     return {
//       month: Number(form.month),
//       year: Number(form.year),
//       typeR: String(form.typeR || "P"),
//       accountType: form.accountType, // "Revenue" | "Cost"
//       budgetedAmount: Number(form.budgetedAmount || 0),
//       balanceFirst: Number(form.balanceFirst || 0),
//       company: String(form.company || "others"),
//       component: String(form.component || ""),
//       accountno: String(form.accountno || ""),
//       auxcode: String(form.auxcode || ""),
//       cc2: String(form.cc2 || ""),
//       cc3: String(form.cc3 || ""),
//     };
//   }

//   async function save() {
//     const err = validateForm();
//     if (err) return Alert.alert("Validation", err);

//     const payload = buildPayload();

//     try {
//       setSaving(true);
//       const url = isEditing ? `${ENDPOINT}/${editingId}` : ENDPOINT;
//       const method = isEditing ? "PUT" : "POST";

//       const res = await fetch(url, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Save failed");

//       setModalVisible(false);
//       await loadAll();
//     } catch (e) {
//       Alert.alert("Error", e.message);
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function remove(id) {
//     Alert.alert("Confirm", "Delete this row?", [
//       { text: "Cancel", style: "cancel" },
//       {
//         text: "Delete",
//         style: "destructive",
//         onPress: async () => {
//           try {
//             const res = await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
//             const data = await res.json();
//             if (!res.ok) throw new Error(data?.error || "Delete failed");
//             await loadAll();
//           } catch (e) {
//             Alert.alert("Error", e.message);
//           }
//         },
//       },
//     ]);
//   }

//   const Header = () => (
//     <View style={styles.header}>
//         <CustomHeader title="Back"  />
//       <Text style={styles.title}>Projects Related Balance</Text>
//       <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
//         <Text style={styles.addBtnText}>+ Add</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   const TableHeader = () => (
//     <View style={[styles.row, styles.tableHeader]}>
//       <Text style={[styles.cell, styles.hCell, { flex: 1}]}>YM</Text>
//       <Text style={[styles.cell, styles.hCell, { flex: 1 }]}>Type</Text>
//       <Text style={[styles.cell, styles.hCell, { flex: 2.2 }]}>Component</Text>
//       <Text style={[styles.cell, styles.hCell, { flex: 2.2 }]}>Budgeted</Text>
//       <Text style={[styles.cell, styles.hCell, { flex: 1.4 }]}>Actual</Text>
//       <Text style={[styles.cell, styles.hCell, { flex: 1.8 }]}>Actions</Text>
//     </View>
//   );

//   const RowItem = ({ item }) => {
//     const ym = `${String(item.year).padStart(4, "0")}-${String(item.month).padStart(2, "0")}`;
//     return (
//       <View style={styles.row}>
//         <Text style={[styles.cell, { flex: 1.2 }]}>{ym}</Text>
//         <Text style={[styles.cell, { flex: 1.2 }]}>{item.accountType}</Text>
//         <Text style={[styles.cell, { flex: 2.2 }]} numberOfLines={1}>
//           {item.component || ""}
//         </Text>
//         <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
//           {Number(item.budgetedAmount || 0).toFixed(2)}
//         </Text>
//         <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
//           {Number(item.balanceFirst || 0).toFixed(2)}
//         </Text>

//         <View style={[styles.cell, { flex: 1.8, flexDirection: "row", gap: 8 }]}>
//           <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
//             <Text style={styles.actionText}>Edit</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.delBtn} onPress={() => remove(item._id)}>
//             <Text style={styles.actionText}>Del</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   };

//   return (
//     <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
//     <View style={styles.container}>
//       <Header />

//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator />
//           <Text style={{ marginTop: 8 }}>Loading...</Text>
//         </View>
//       ) : (
//         <>
//           <TableHeader />
//           <FlatList
//             data={rows}
//             showsVerticalScrollIndicator={false}
//             keyExtractor={(item) => item._id}
//             renderItem={({ item }) => <RowItem item={item} />}
//             ListEmptyComponent={
//               <View style={styles.center}>
//                 <Text>No data yet. Tap + Add.</Text>
//               </View>
//             }
//             contentContainerStyle={{ paddingBottom: 24 }}
//           />
//         </>
//       )}

//       {/* MODAL */}
//       <Modal visible={modalVisible} animationType="slide" transparent>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === "ios" ? "padding" : undefined}
//           style={styles.modalWrap}
//         >
//           <View style={styles.modalCard}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>
//                 {isEditing ? "Edit Row" : "Add New Row"}
//               </Text>
//               <TouchableOpacity onPress={closeModal} disabled={saving}>
//                 <Text style={[styles.closeText, saving && { opacity: 0.5 }]}>✕</Text>
//               </TouchableOpacity>
//             </View>

//             <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
//               <View style={styles.formRow}>
//                 <Field label="Month (1-12)">
//                   <TextInput
//                     value={form.month}
//                     onChangeText={(v) => setField("month", v)}
//                     keyboardType="number-pad"
//                     style={styles.input}
//                     placeholder="e.g. 2"
//                   />
//                 </Field>
//                 <Field label="Year">
//                   <TextInput
//                     value={form.year}
//                     onChangeText={(v) => setField("year", v)}
//                     keyboardType="number-pad"
//                     style={styles.input}
//                     placeholder="e.g. 2026"
//                   />
//                 </Field>
//               </View>

//               <View style={styles.formRow}>
//                 <Field label='accountType ("Revenue" / "Cost")'>
//                   <TextInput
//                     value={form.accountType}
//                     onChangeText={(v) => setField("accountType", v)}
//                     style={styles.input}
//                     placeholder="Revenue"
//                   />
//                 </Field>
//                 <Field label="typeR">
//                   <TextInput
//                     value={form.typeR}
//                     onChangeText={(v) => setField("typeR", v)}
//                     style={styles.input}
//                     placeholder="P"
//                   />
//                 </Field>
//               </View>

//               <Field label="Company">
//                 <TextInput
//                   value={form.company}
//                   onChangeText={(v) => setField("company", v)}
//                   style={styles.input}
//                   placeholder="West Walk Real Estate"
//                 />
//               </Field>

//               <Field label="Component">
//                 <TextInput
//                   value={form.component}
//                   onChangeText={(v) => setField("component", v)}
//                   style={styles.input}
//                   placeholder='Tenant Variation Request'
//                 />
//               </Field>

//               <View style={styles.formRow}>
//                 <Field label="Account No">
//                   <TextInput
//                     value={form.accountno}
//                     onChangeText={(v) => setField("accountno", v)}
//                     style={styles.input}
//                     placeholder="44104"
//                   />
//                 </Field>
//                 <Field label="Aux Code">
//                   <TextInput
//                     value={form.auxcode}
//                     onChangeText={(v) => setField("auxcode", v)}
//                     style={styles.input}
//                     placeholder=""
//                   />
//                 </Field>
//               </View>

//               <View style={styles.formRow}>
//                 <Field label="CC2">
//                   <TextInput
//                     value={form.cc2}
//                     onChangeText={(v) => setField("cc2", v)}
//                     style={styles.input}
//                     placeholder=""
//                   />
//                 </Field>
//                 <Field label="CC3">
//                   <TextInput
//                     value={form.cc3}
//                     onChangeText={(v) => setField("cc3", v)}
//                     style={styles.input}
//                     placeholder=""
//                   />
//                 </Field>
//               </View>

//               <View style={styles.formRow}>
//                 <Field label="Budgeted Amount">
//                   <TextInput
//                     value={form.budgetedAmount}
//                     onChangeText={(v) => setField("budgetedAmount", v)}
//                     keyboardType="decimal-pad"
//                     style={styles.input}
//                     placeholder="0"
//                   />
//                 </Field>
//                 <Field label="Balance First">
//                   <TextInput
//                     value={form.balanceFirst}
//                     onChangeText={(v) => setField("balanceFirst", v)}
//                     keyboardType="decimal-pad"
//                     style={styles.input}
//                     placeholder="0"
//                   />
//                 </Field>
//               </View>

//               <TouchableOpacity
//                 style={[styles.saveBtn, saving && { opacity: 0.7 }]}
//                 onPress={save}
//                 disabled={saving}
//               >
//                 <Text style={styles.saveText}>
//                   {saving ? "Saving..." : isEditing ? "Update" : "Create"}
//                 </Text>
//               </TouchableOpacity>
//             </ScrollView>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>
//     </View>
//     </Container>
//   );
// }

// function Field({ label, children }) {
//   return (
//     <View style={{ flex: 1, marginBottom: 12 }}>
//       <Text style={styles.label}>{label}</Text>
//       {children}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { paddingHorizontal: 20, },

//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     marginBottom: 12,
//   },
//   title: { fontSize: 18, fontWeight: "700" },
//   addBtn: {
//     paddingVertical: 10,
//     paddingHorizontal: 14,
//     borderRadius: 10,
//     backgroundColor: "#111",
//   },
//   addBtnText: { color: "#fff", fontWeight: "700" },

//   center: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },

//   tableHeader: {
//     backgroundColor: "#f3f4f6",
//     borderTopLeftRadius: 10,
//     borderTopRightRadius: 10,
//   },
//   row: {
//     flexDirection: "row",
//     paddingVertical: 10,
//     paddingHorizontal: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//     alignItems: "center",
//   },
//   cell: { fontSize: 12, paddingHorizontal: 4 },
//   hCell: { fontWeight: "700" },

//   editBtn: {
//     backgroundColor: "#2563eb",
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//   },
//   delBtn: {
//     backgroundColor: "#dc2626",
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//   },
//   actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },

//   modalWrap: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.35)",
//     justifyContent: "flex-end",
//   },
//   modalCard: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 18,
//     borderTopRightRadius: 18,
//     padding: 14,
//     maxHeight: "92%",
//   },
//   modalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   modalTitle: { fontSize: 16, fontWeight: "800" },
//   closeText: { fontSize: 18, fontWeight: "800" },

//   label: { fontSize: 12, fontWeight: "700", marginBottom: 6, color: "#111" },
//   input: {
//     borderWidth: 1,
//     borderColor: "#e5e7eb",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 10,
//     fontSize: 14,
//   },
//   formRow: { flexDirection: "row", gap: 10 },

//   saveBtn: {
//     marginTop: 8,
//     backgroundColor: "#111",
//     paddingVertical: 12,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   saveText: { color: "#fff", fontWeight: "800" },
// });