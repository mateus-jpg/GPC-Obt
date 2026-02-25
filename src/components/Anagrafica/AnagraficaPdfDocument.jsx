"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Simple HTML stripper safe for non-DOM context (PDF renderer)
function stripHtmlSimple(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPdfDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return format(d, "dd MMMM yyyy 'alle' HH:mm", { locale: it });
  } catch {
    return "-";
  }
}

function formatFirestoreTimestamp(ts) {
  if (!ts) return "-";
  if (ts._seconds || ts.seconds) {
    return format(new Date((ts._seconds || ts.seconds) * 1000), "dd/MM/yyyy", {
      locale: it,
    });
  }
  if (typeof ts === "string") {
    try {
      return format(new Date(ts), "dd/MM/yyyy", { locale: it });
    } catch {
      return "-";
    }
  }
  return "-";
}

const COLORS = {
  primary: "#1e40af",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  sectionBg: "#f9fafb",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1e40af",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 9,
    color: COLORS.muted,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1px solid #e5e7eb",
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  fieldItem: {
    width: "48%",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    color: COLORS.text,
  },
  accessBlock: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: COLORS.sectionBg,
    borderLeft: "3px solid #1e40af",
    borderRadius: 2,
  },
  accessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  accessDate: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  accessOperator: {
    fontSize: 9,
    color: COLORS.muted,
  },
  serviceBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #e5e7eb",
  },
  serviceRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  serviceLabel: {
    fontSize: 9,
    color: COLORS.muted,
    width: 110,
    flexShrink: 0,
  },
  serviceValue: {
    fontSize: 9,
    color: COLORS.text,
    flex: 1,
  },
  historyEntry: {
    marginBottom: 12,
  },
  historyMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 3,
  },
  historyGroup: {
    paddingLeft: 8,
    marginTop: 3,
  },
  historyGroupTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  historyChange: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  historyFieldLabel: {
    fontSize: 8,
    color: COLORS.muted,
    width: 100,
    flexShrink: 0,
  },
  historyBefore: {
    fontSize: 8,
    color: "#991b1b",
    flex: 1,
    marginRight: 4,
  },
  historyArrow: {
    fontSize: 8,
    color: COLORS.muted,
    marginRight: 4,
  },
  historyAfter: {
    fontSize: 8,
    color: "#166534",
    flex: 1,
  },
  emptyText: {
    fontSize: 10,
    color: COLORS.muted,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
});

const GROUP_LABELS = {
  anagrafica: "Dati Personali",
  nucleoFamiliare: "Nucleo Familiare",
  legaleAbitativa: "Situazione Legale e Abitativa",
  lavoroFormazione: "Lavoro e Formazione",
  vulnerabilita: "Vulnerabilità",
  referral: "Referral",
};

const FIELD_LABELS = {
  nome: "Nome",
  cognome: "Cognome",
  sesso: "Sesso",
  dataDiNascita: "Data di Nascita",
  luogoDiNascita: "Luogo di Nascita",
  cittadinanza: "Cittadinanza",
  comuneDiDomicilio: "Comune di Domicilio",
  telefono: "Telefono",
  email: "Email",
  nucleo: "Tipo Nucleo",
  nucleoTipo: "Composizione Nucleo",
  figli: "Numero Figli",
  situazioneLegale: "Situazione Legale",
  situazioneAbitativa: "Situazione Abitativa",
  situazioneLavorativa: "Situazione Lavorativa",
  titoloDiStudioOrigine: "Titolo di Studio (Origine)",
  titoloDiStudioItalia: "Titolo di Studio (Italia)",
  conoscenzaItaliano: "Conoscenza Italiano",
  vulnerabilita: "Vulnerabilità",
  intenzioneItalia: "Intenzione Italia",
  paeseDestinazione: "Paese di Destinazione",
  referral: "Referral",
  referralAltro: "Referral (Altro)",
};

function formatFieldValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "object") {
    if (value.seconds || value._seconds) return formatFirestoreTimestamp(value);
    return JSON.stringify(value);
  }
  return String(value) || "-";
}

function isEmptyValue(val) {
  if (val === null || val === undefined || val === "" || val === 0) return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

function AnagraficaSection({ anagrafica }) {
  const a = anagrafica.anagrafica || {};
  const fields = [
    ["Nome", a.nome],
    ["Cognome", a.cognome],
    ["Sesso", a.sesso],
    [
      "Data di Nascita",
      a.dataDiNascita ? formatFirestoreTimestamp(a.dataDiNascita) : "-",
    ],
    ["Luogo di Nascita", a.luogoDiNascita],
    [
      "Cittadinanza",
      Array.isArray(a.cittadinanza)
        ? a.cittadinanza.join(", ")
        : a.cittadinanza,
    ],
    ["Comune di Domicilio", a.comuneDiDomicilio],
    ["Telefono", a.telefono],
    ["Email", a.email],
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DATI ANAGRAFICI</Text>
      <View style={styles.fieldGrid}>
        {fields.map(([label, value]) => (
          <View key={label} style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value || "-"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ServiceRow({ label, value }) {
  if (!value || value === "-") return null;
  return (
    <View style={styles.serviceRow}>
      <Text style={styles.serviceLabel}>{label}:</Text>
      <Text style={styles.serviceValue}>{value}</Text>
    </View>
  );
}

function AccessesSection({ accesses }) {
  const sorted = [...(accesses || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ACCESSI ({sorted.length})</Text>
      {sorted.length === 0 ? (
        <Text style={styles.emptyText}>Nessun accesso registrato.</Text>
      ) : (
        sorted.map((acc, i) => (
          <View key={acc.id || i} style={styles.accessBlock}>
            <View style={styles.accessHeader}>
              <Text style={styles.accessDate}>
                {formatPdfDateTime(acc.createdAt)}
              </Text>
              <Text style={styles.accessOperator}>
                {acc.createdByEmail || acc.createdBy || ""}
              </Text>
            </View>
            {(acc.services || []).map((svc, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: services have no stable id
              <View key={j} style={styles.serviceBlock}>
                <ServiceRow label="Tipo" value={svc.tipoAccesso} />
                <ServiceRow
                  label="Sottocategorie"
                  value={
                    Array.isArray(svc.sottoCategorie)
                      ? svc.sottoCategorie.join(", ")
                      : svc.sottoCategorie
                  }
                />
                <ServiceRow
                  label="Classificazione"
                  value={svc.classificazione}
                />
                <ServiceRow
                  label="Ente di riferimento"
                  value={svc.enteRiferimento}
                />
                <ServiceRow label="Note" value={stripHtmlSimple(svc.note)} />
                <ServiceRow
                  label="Promemoria"
                  value={
                    svc.reminderDate
                      ? formatPdfDateTime(svc.reminderDate)
                      : null
                  }
                />
                {svc.files && svc.files.length > 0 && (
                  <ServiceRow
                    label="File allegati"
                    value={svc.files
                      .map((f) => f.nome || f.nomeOriginale)
                      .join(", ")}
                  />
                )}
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function HistorySection({ entries }) {
  const sorted = [...(entries || [])].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
  );

  const changeTypeLabels = {
    create: "Creazione",
    update: "Modifica",
    delete: "Eliminazione",
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>CRONOLOGIA MODIFICHE ANAGRAFICA</Text>
      {sorted.length === 0 ? (
        <Text style={styles.emptyText}>Nessuna modifica registrata.</Text>
      ) : (
        sorted.map((entry) => {
          const groupEntries = Object.entries(entry.changes || {});
          return (
            <View key={entry.id} style={styles.historyEntry}>
              <Text style={styles.historyMeta}>
                {formatPdfDateTime(entry.changedAt)} ·{" "}
                {changeTypeLabels[entry.changeType] || entry.changeType} ·{" "}
                {entry.changedByMail || entry.changedBy || "Sconosciuto"}
              </Text>
              {groupEntries.map(([groupName, { before, after }]) => {
                const allKeys = new Set([
                  ...Object.keys(before || {}),
                  ...Object.keys(after || {}),
                ]);
                const changedFields = Array.from(allKeys).filter((key) => {
                  const bv = before?.[key];
                  const av = after?.[key];
                  if (isEmptyValue(bv) && isEmptyValue(av)) return false;
                  return JSON.stringify(bv) !== JSON.stringify(av);
                });
                if (changedFields.length === 0) return null;
                return (
                  <View key={groupName} style={styles.historyGroup}>
                    <Text style={styles.historyGroupTitle}>
                      {GROUP_LABELS[groupName] || groupName}
                    </Text>
                    {changedFields.map((field) => (
                      <View key={field} style={styles.historyChange}>
                        <Text style={styles.historyFieldLabel}>
                          {FIELD_LABELS[field] || field}
                        </Text>
                        <Text style={styles.historyBefore}>
                          {formatFieldValue(before?.[field])}
                        </Text>
                        <Text style={styles.historyArrow}>{">"}</Text>
                        <Text style={styles.historyAfter}>
                          {formatFieldValue(after?.[field])}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </View>
  );
}

export function AnagraficaPdfDocument({
  anagrafica,
  accesses,
  historyEntries,
}) {
  const nome = anagrafica?.anagrafica?.nome || "";
  const cognome = anagrafica?.anagrafica?.cognome || "";
  const fullName = `${nome} ${cognome}`.trim();
  const today = format(new Date(), "dd/MM/yyyy", { locale: it });

  return (
    <Document
      title={`Scheda Anagrafica - ${fullName}`}
      author="GPC"
      subject="Scheda Anagrafica"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SCHEDA ANAGRAFICA</Text>
          <Text style={styles.headerSubtitle}>{fullName}</Text>
          <Text style={styles.headerMeta}>Generato il: {today}</Text>
        </View>

        <AnagraficaSection anagrafica={anagrafica} />
        <AccessesSection accesses={accesses} />
        <HistorySection entries={historyEntries} />

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GPC - Scheda Anagrafica</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
