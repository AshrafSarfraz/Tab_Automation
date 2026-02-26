// ProjectsTrailBalanceScreen.js
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
} from "react-native";
import CustomHeader from "../../../../component/customHeader";


const API_BASE = "https://financesystemawh-rtjt.onrender.com"


const ENDPOINT = `${API_BASE}/ProjectsTrailBalance`;

const emptyForm = {
  month: "",
  year: "",
  typeR: "P",
  accountType: "Revenue", // must be "Revenue" or "Cost"
  budgetedAmount: "0",
  balanceFirst: "0",
  company: "",
  component: "",
  accountno: "",
  auxcode: "",
  cc2: "",
  cc3: "",
};

export default function AddProjects() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const res = await fetch(ENDPOINT);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load data");
      // sort newest first (year/month)
      const sorted = [...(data || [])].sort((a, b) => {
        const ay = Number(a.year) || 0;
        const by = Number(b.year) || 0;
        if (by !== ay) return by - ay;
        const am = Number(a.month) || 0;
        const bm = Number(b.month) || 0;
        return bm - am;
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
    setForm({
      ...emptyForm,
      // small helpful defaults
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
    });
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      month: String(item.month ?? ""),
      year: String(item.year ?? ""),
      typeR: String(item.typeR ?? "P"),
      accountType: String(item.accountType ?? "Revenue"),
      budgetedAmount: String(item.budgetedAmount ?? 0),
      balanceFirst: String(item.balanceFirst ?? 0),
      company: String(item.company ?? ""),
      component: String(item.component ?? ""),
      accountno: String(item.accountno ?? ""),
      auxcode: String(item.auxcode ?? ""),
      cc2: String(item.cc2 ?? ""),
      cc3: String(item.cc3 ?? ""),
    });
    setModalVisible(true);
  }

  function closeModal() {
    if (saving) return;
    setModalVisible(false);
  }

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateForm() {
    const month = Number(form.month);
    const year = Number(form.year);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return "Month must be between 1 and 12";
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return "Year looks invalid";
    }
    const at = String(form.accountType || "");
    if (at !== "Revenue" && at !== "Cost") {
      return 'accountType must be "Revenue" or "Cost"';
    }
    return null;
  }

  function buildPayload() {
    return {
      month: Number(form.month),
      year: Number(form.year),
      typeR: String(form.typeR || "P"),
      accountType: form.accountType, // "Revenue" | "Cost"
      budgetedAmount: Number(form.budgetedAmount || 0),
      balanceFirst: Number(form.balanceFirst || 0),
      company: String(form.company || "others"),
      component: String(form.component || ""),
      accountno: String(form.accountno || ""),
      auxcode: String(form.auxcode || ""),
      cc2: String(form.cc2 || ""),
      cc3: String(form.cc3 || ""),
    };
  }

  async function save() {
    const err = validateForm();
    if (err) return Alert.alert("Validation", err);

    const payload = buildPayload();

    try {
      setSaving(true);
      const url = isEditing ? `${ENDPOINT}/${editingId}` : ENDPOINT;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
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
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
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

  const Header = () => (
    <View style={styles.header}>
        <CustomHeader title="Back"  />
      <Text style={styles.title}>Projects Related Balance</Text>
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const TableHeader = () => (
    <View style={[styles.row, styles.tableHeader]}>
      <Text style={[styles.cell, styles.hCell, { flex: 1}]}>YM</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1 }]}>Type</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 2.2 }]}>Component</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 2.2 }]}>Budgeted</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.4 }]}>Actual</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.8 }]}>Actions</Text>
    </View>
  );

  const RowItem = ({ item }) => {
    const ym = `${String(item.year).padStart(4, "0")}-${String(item.month).padStart(2, "0")}`;
    return (
      <View style={styles.row}>
        <Text style={[styles.cell, { flex: 1.2 }]}>{ym}</Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>{item.accountType}</Text>
        <Text style={[styles.cell, { flex: 2.2 }]} numberOfLines={1}>
          {item.component || ""}
        </Text>
        <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
          {Number(item.budgetedAmount || 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
          {Number(item.balanceFirst || 0).toFixed(2)}
        </Text>

        <View style={[styles.cell, { flex: 1.8, flexDirection: "row", gap: 8 }]}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={() => remove(item._id)}>
            <Text style={styles.actionText}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading...</Text>
        </View>
      ) : (
        <>
          <TableHeader />
          <FlatList
            data={rows}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <RowItem item={item} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text>No data yet. Tap + Add.</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </>
      )}

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
              <TouchableOpacity onPress={closeModal} disabled={saving}>
                <Text style={[styles.closeText, saving && { opacity: 0.5 }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={styles.formRow}>
                <Field label="Month (1-12)">
                  <TextInput
                    value={form.month}
                    onChangeText={(v) => setField("month", v)}
                    keyboardType="number-pad"
                    style={styles.input}
                    placeholder="e.g. 2"
                  />
                </Field>
                <Field label="Year">
                  <TextInput
                    value={form.year}
                    onChangeText={(v) => setField("year", v)}
                    keyboardType="number-pad"
                    style={styles.input}
                    placeholder="e.g. 2026"
                  />
                </Field>
              </View>

              <View style={styles.formRow}>
                <Field label='accountType ("Revenue" / "Cost")'>
                  <TextInput
                    value={form.accountType}
                    onChangeText={(v) => setField("accountType", v)}
                    style={styles.input}
                    placeholder="Revenue"
                  />
                </Field>
                <Field label="typeR">
                  <TextInput
                    value={form.typeR}
                    onChangeText={(v) => setField("typeR", v)}
                    style={styles.input}
                    placeholder="P"
                  />
                </Field>
              </View>

              <Field label="Company">
                <TextInput
                  value={form.company}
                  onChangeText={(v) => setField("company", v)}
                  style={styles.input}
                  placeholder="West Walk Real Estate"
                />
              </Field>

              <Field label="Component">
                <TextInput
                  value={form.component}
                  onChangeText={(v) => setField("component", v)}
                  style={styles.input}
                  placeholder='Tenant Variation Request'
                />
              </Field>

              <View style={styles.formRow}>
                <Field label="Account No">
                  <TextInput
                    value={form.accountno}
                    onChangeText={(v) => setField("accountno", v)}
                    style={styles.input}
                    placeholder="44104"
                  />
                </Field>
                <Field label="Aux Code">
                  <TextInput
                    value={form.auxcode}
                    onChangeText={(v) => setField("auxcode", v)}
                    style={styles.input}
                    placeholder=""
                  />
                </Field>
              </View>

              <View style={styles.formRow}>
                <Field label="CC2">
                  <TextInput
                    value={form.cc2}
                    onChangeText={(v) => setField("cc2", v)}
                    style={styles.input}
                    placeholder=""
                  />
                </Field>
                <Field label="CC3">
                  <TextInput
                    value={form.cc3}
                    onChangeText={(v) => setField("cc3", v)}
                    style={styles.input}
                    placeholder=""
                  />
                </Field>
              </View>

              <View style={styles.formRow}>
                <Field label="Budgeted Amount">
                  <TextInput
                    value={form.budgetedAmount}
                    onChangeText={(v) => setField("budgetedAmount", v)}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0"
                  />
                </Field>
                <Field label="Balance First">
                  <TextInput
                    value={form.balanceFirst}
                    onChangeText={(v) => setField("balanceFirst", v)}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0"
                  />
                </Field>
              </View>

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
  );
}

function Field({ label, children }) {
  return (
    <View style={{ flex: 1, marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop:20, paddingHorizontal: 20, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  addBtnText: { color: "#fff", fontWeight: "700" },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },

  tableHeader: {
    backgroundColor: "#f3f4f6",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  cell: { fontSize: 12, paddingHorizontal: 4 },
  hCell: { fontWeight: "700" },

  editBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  delBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  closeText: { fontSize: 18, fontWeight: "800" },

  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formRow: { flexDirection: "row", gap: 10 },

  saveBtn: {
    marginTop: 8,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "800" },
});