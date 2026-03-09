// CapexBalanceScreen.js
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
import Container from "../../../../ui/useLayout";
import { Colors } from "../../../../themes/color";

const API_BASE = "https://financesystemawh-rtjt.onrender.com";
const ENDPOINT = `${API_BASE}/CapexBalance`;

const emptyForm = {
  Project: "",
  accountType: "Cost", // Cost | NetProfit
  component: "",
  year: "",
  Amount: "0",
  PRwithFinance: "0",
  PRwithoutFinance: "0",
};

export default function CapexBalanceScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [projectSuggestions, setProjectSuggestions] = useState([]);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);

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

      const sorted = [...(data || [])].sort((a, b) => {
        const by = Number(b.year) || 0;
        const ay = Number(a.year) || 0;
        return by - ay;
      });

      setRows(sorted);

      const uniqueProjects = [
        ...new Set(
          (data || [])
            .map((item) => String(item.Project || "").trim())
            .filter(Boolean)
        ),
      ];
      setProjectSuggestions(uniqueProjects);
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
      year: String(new Date().getFullYear()),
    });
    setShowProjectSuggestions(false);
    setShowAccountTypeDropdown(false);
    setModalVisible(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);
    setForm({
      Project: String(item.Project ?? ""),
      accountType: String(item.accountType ?? "Cost"),
      component: String(item.component ?? ""),
      year: String(item.year ?? ""),
      Amount: String(item.Amount ?? 0),
      PRwithFinance: String(item.PRwithFinance ?? 0),
      PRwithoutFinance: String(item.PRwithoutFinance ?? 0),
    });
    setShowProjectSuggestions(false);
    setShowAccountTypeDropdown(false);
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
    const year = Number(form.year);

    if (!form.Project?.trim()) {
      return "Project is required";
    }

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return "Year looks invalid";
    }

    if (!["Cost", "NetProfit"].includes(form.accountType)) {
      return 'accountType must be "Cost" or "NetProfit"';
    }

    return null;
  }

  function buildPayload() {
    return {
      Project: String(form.Project || "").trim(),
      accountType: String(form.accountType || "Cost"),
      component: String(form.component || "").trim(),
      year: Number(form.year),
      Amount: Number(form.Amount || 0),
      PRwithFinance: Number(form.PRwithFinance || 0),
      PRwithoutFinance: Number(form.PRwithoutFinance || 0),
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

  const filteredProjectSuggestions = projectSuggestions.filter((p) =>
    p.toLowerCase().includes((form.Project || "").toLowerCase())
  );

  const Header = () => (
    <View style={styles.header}>
      <CustomHeader title="Back" />
      <Text style={styles.title}>Capex Balance</Text>
      <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const TableHeader = () => (
    <View style={[styles.row, styles.tableHeader]}>
      <Text style={[styles.cell, styles.hCell, { flex: 1.3 }]}>Project</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.3 }]}>Type</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.3 }]}>Component</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.3 }]}>Year</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.8 }]}>Actual</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.8 }]}>PR(Finance)</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 1.8 }]}>PR(Without Finance)</Text>
      <Text style={[styles.cell, styles.hCell, { flex: 2 }]}>Actions</Text>
    </View>
  );

  const RowItem = ({ item }) => {
    return (
      <View style={styles.row}>
        <Text style={[styles.cell, { flex: 1.3 }]} numberOfLines={1}>
          {item.Project || ""}
        </Text>
        <Text style={[styles.cell, { flex: 1.3 }]} numberOfLines={1}>
          {item.component || ""}
        </Text>
        <Text style={[styles.cell, { flex: 1.3 }]}>{item.accountType}</Text>
        <Text style={[styles.cell, { flex: 1.3 }]}>{item.year}</Text>
        <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
          {Number(item.Amount || 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
          {Number(item.PRwithFinance || 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>
          {Number(item.PRwithoutFinance || 0).toFixed(2)}
        </Text>

        <View style={[styles.cell, { flex: 2, flexDirection: "row", gap: 8 }]}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.delBtn} onPress={() => remove(item._id)}>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
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

        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrap}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit Capex" : "Add Capex"}
                </Text>
                <TouchableOpacity onPress={closeModal} disabled={saving}>
                  <Text style={[styles.closeText, saving && { opacity: 0.5 }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {/* Project with suggestions */}
                <Field label="Project">
                  <TextInput
                    value={form.Project}
                    onChangeText={(v) => {
                      setField("Project", v);
                      setShowProjectSuggestions(true);
                    }}
                    onFocus={() => setShowProjectSuggestions(true)}
                    style={styles.input}
                    placeholder="Enter project name"
                  />

                  {showProjectSuggestions && filteredProjectSuggestions.length > 0 && (
                    <View style={styles.dropdown}>
                      {filteredProjectSuggestions.slice(0, 6).map((project, index) => (
                        <TouchableOpacity
                          key={`${project}-${index}`}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setField("Project", project);
                            setShowProjectSuggestions(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{project}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Field>

                {/* accountType dropdown */}
                <Field label="Account Type">
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setShowAccountTypeDropdown((p) => !p)}
                  >
                    <Text style={styles.selectText}>
                      {form.accountType || "Select account type"}
                    </Text>
                  </TouchableOpacity>

                  {showAccountTypeDropdown && (
                    <View style={styles.dropdown}>
                      {["Cost", "NetProfit"].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setField("accountType", type);
                            setShowAccountTypeDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Field>

                <Field label="Component">
                  <TextInput
                    value={form.component}
                    onChangeText={(v) => setField("component", v)}
                    style={styles.input}
                    placeholder="Hardware"
                  />
                </Field>

                <Field label="Year">
                  <TextInput
                    value={form.year}
                    onChangeText={(v) => setField("year", v)}
                    keyboardType="number-pad"
                    style={styles.input}
                    placeholder="2026"
                  />
                </Field>

                <View style={styles.formRow}>
                  <Field label="Amount">
                    <TextInput
                      value={form.Amount}
                      onChangeText={(v) => setField("Amount", v)}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="PR with Finance">
                    <TextInput
                      value={form.PRwithFinance}
                      onChangeText={(v) => setField("PRwithFinance", v)}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      placeholder="0"
                    />
                  </Field>
                </View>

                <Field label="PR without Finance">
                  <TextInput
                    value={form.PRwithoutFinance}
                    onChangeText={(v) => setField("PRwithoutFinance", v)}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="0"
                  />
                </Field>

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
    </Container>
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
  container: {
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111",
  },

  addBtnText: {
    color: "#fff",
    fontWeight: "700",
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },

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

  cell: {
    fontSize: 12,
    paddingHorizontal: 4,
  },

  hCell: {
    fontWeight: "700",
  },

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

  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

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

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  closeText: {
    fontSize: 18,
    fontWeight: "800",
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  selectInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },

  selectText: {
    fontSize: 14,
    color: "#111",
  },

  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },

  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  dropdownItemText: {
    fontSize: 14,
    color: "#111",
  },

  formRow: {
    flexDirection: "row",
    gap: 10,
  },

  saveBtn: {
    marginTop: 8,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "800",
  },
});