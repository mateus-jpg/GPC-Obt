const admin = require("firebase-admin");
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { getISOWeek, differenceInYears } = require("date-fns");



admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getWeekId(date) {
  const week = getISOWeek(date);
  const year = date.getFullYear();
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getMonthId(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function getDailyId(date) {
  return date.toISOString().split("T")[0];
}

function normalizeDate(date) {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (date._seconds) return new Date(date._seconds * 1000);
  return new Date(date);
}

function calculateAgeRange(dataDiNascita) {
  if (!dataDiNascita) return null;
  const birthDate = normalizeDate(dataDiNascita);
  if (!birthDate || isNaN(birthDate)) return null;

  const age = differenceInYears(new Date(), birthDate);
  if (age < 18) return "<18";
  if (age <= 20) return "18-20";
  if (age <= 30) return "21-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  return ">60";
}

/**
 * Helper to safely increment or decrement a counter in a map.
 * @param {Object} counterObj - The object containing counters (e.g., stats.byGender)
 * @param {String} key - The key to update (e.g., "Male")
 * @param {Number} amount - 1 for increment, -1 for decrement
 */
function updateCategory(counterObj, key, amount = 1) {
  if (!key) return;
  // Ensure we don't go below zero
  const current = counterObj[key] || 0;
  const next = current + amount;
  counterObj[key] = next > 0 ? next : 0;
}

function processArrayCategory(counterObj, values, amount = 1) {
  if (!Array.isArray(values)) return;
  values.forEach((value) => updateCategory(counterObj, value, amount));
}

// ============================================================================
// STATS AGGREGATION LOGIC
// ============================================================================

async function updateAnagraficaStats(docRef, data, increment = true) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    // Initialize or copy existing stats
    const newStats = {
      totalPersons: Math.max(0, (statsData?.totalPersons || 0) + amount),
      byGender: { ...statsData?.byGender },
      byAgeRange: { ...statsData?.byAgeRange },
      byCittadinanza: { ...statsData?.byCittadinanza },
      byBirthPlace: { ...statsData?.byBirthPlace },
      byFamilyType: { ...statsData?.byFamilyType },
      byNucleoType: { ...statsData?.byNucleoType },
      byChildrenCount: { ...statsData?.byChildrenCount },
      byLegalStatus: { ...statsData?.byLegalStatus },
      byHousingStatus: { ...statsData?.byHousingStatus },
      byJobStatus: { ...statsData?.byJobStatus },
      byEducationOrigin: { ...statsData?.byEducationOrigin },
      byEducationItaly: { ...statsData?.byEducationItaly },
      byItalianLevel: { ...statsData?.byItalianLevel },
      byVulnerability: { ...statsData?.byVulnerability },
      byIntenzioneItalia: { ...statsData?.byIntenzioneItalia },
      byReferral: { ...statsData?.byReferral },
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Update Counters
    updateCategory(newStats.byGender, data.anagrafica?.sesso, amount);
    updateCategory(newStats.byAgeRange, calculateAgeRange(data.anagrafica?.dataDiNascita), amount);
    updateCategory(newStats.byBirthPlace, data.anagrafica?.luogoDiNascita, amount);
    
    processArrayCategory(newStats.byCittadinanza, data.anagrafica?.cittadinanza, amount);
    
    updateCategory(newStats.byFamilyType, data.nucleoFamiliare?.nucleoTipo, amount);
    updateCategory(newStats.byNucleoType, data.nucleoFamiliare?.nucleo, amount);
    
    const figli = data.nucleoFamiliare?.figli;
    if (figli !== undefined && figli !== null) {
      const figliCategory = figli === 0 ? "0" : figli === 1 ? "1" : figli === 2 ? "2" : figli <= 4 ? "3-4" : "5+";
      updateCategory(newStats.byChildrenCount, figliCategory, amount);
    }

    updateCategory(newStats.byLegalStatus, data.legaleAbitativa?.situazioneLegale, amount);
    processArrayCategory(newStats.byHousingStatus, data.legaleAbitativa?.situazioneAbitativa, amount);
    
    updateCategory(newStats.byJobStatus, data.lavoroFormazione?.situazioneLavorativa, amount);
    updateCategory(newStats.byEducationOrigin, data.lavoroFormazione?.titoloDiStudioOrigine, amount);
    updateCategory(newStats.byEducationItaly, data.lavoroFormazione?.titoloDiStudioItalia, amount);
    updateCategory(newStats.byItalianLevel, data.lavoroFormazione?.conoscenzaItaliano, amount);
    
    processArrayCategory(newStats.byVulnerability, data.vulnerabilita?.vulnerabilita, amount);
    updateCategory(newStats.byIntenzioneItalia, data.vulnerabilita?.intenzioneItalia, amount);
    updateCategory(newStats.byReferral, data.referral?.referral, amount);

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating anagrafica stats:", error);
  }
}

async function updateAccessStats(docRef, data, increment = true) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};
    const amount = increment ? 1 : -1;

    const newStats = {
      totalAccesses: Math.max(0, (statsData?.totalAccesses || 0) + amount),
      byAccessType: { ...statsData?.byAccessType },
      bySubcategory: { ...statsData?.bySubcategory },
      byClassification: { ...statsData?.byClassification },
      byReferralEntity: { ...statsData?.byReferralEntity },
      totalFiles: statsData?.totalFiles || 0,
      filesWithExpiration: statsData?.filesWithExpiration || 0,
      totalReminders: statsData?.totalReminders || 0,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const services = data.services || [];
    for (const service of services) {
      updateCategory(newStats.byAccessType, service.tipoAccesso, amount);
      processArrayCategory(newStats.bySubcategory, service.sottoCategorie, amount);

      if (service.classificazione) {
        let classKey = service.classificazione;
        if (classKey.includes("Presa in carico")) classKey = "Presa in carico";
        else if (classKey.includes("Informativa")) classKey = "Informativa";
        else if (classKey.includes("Referral")) classKey = "Referral";
        updateCategory(newStats.byClassification, classKey, amount);
      }

      updateCategory(newStats.byReferralEntity, service.enteRiferimento, amount);

      const filesCount = service.files?.length || 0;
      const filesWithExpiry = (service.files || []).filter(f => f.dataScadenza).length;

      if (increment) {
        newStats.totalFiles += filesCount;
        newStats.filesWithExpiration += filesWithExpiry;
      } else {
        newStats.totalFiles = Math.max(0, newStats.totalFiles - filesCount);
        newStats.filesWithExpiration = Math.max(0, newStats.filesWithExpiration - filesWithExpiry);
      }
      
      if (service.reminderDate) {
         if (increment) newStats.totalReminders++;
         else newStats.totalReminders = Math.max(0, newStats.totalReminders - 1);
      }
    }

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating access stats:", error);
  }
}

async function updateReminderStats(docRef, reminderData, isNew, wasCompleted, isNowCompleted) {
  try {
    const docSnap = await docRef.get();
    const statsData = docSnap.exists ? docSnap.data() : {};

    const newStats = {
      totalRemindersCreated: statsData?.totalRemindersCreated || 0,
      activeReminders: statsData?.activeReminders || 0,
      completedReminders: statsData?.completedReminders || 0,
      remindersByServiceType: { ...statsData?.remindersByServiceType },
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (isNew) {
      newStats.totalRemindersCreated += 1;
      newStats.activeReminders += 1;
      updateCategory(newStats.remindersByServiceType, reminderData.serviceType, 1);
    }

    if (!wasCompleted && isNowCompleted) {
      newStats.activeReminders = Math.max(0, newStats.activeReminders - 1);
      newStats.completedReminders += 1;
    } else if (wasCompleted && !isNowCompleted) {
      newStats.activeReminders += 1;
      newStats.completedReminders = Math.max(0, newStats.completedReminders - 1);
    }

    await docRef.set(newStats, { merge: true });
  } catch (error) {
    console.error("Error updating reminder stats:", error);
  }
}

// ============================================================================
// TRIGGERS - ANAGRAFICA
// ============================================================================

exports.onAnagraficaCreate = onDocumentCreated(
  { document: "anagrafica/{personId}", region: "europe-west8" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    
    const structures = data.structureIds || data.canBeAccessedBy || [];
    const now = new Date();

    for (const structureId of structures) {
      // Parallelize updates for performance
      await Promise.all([
        updateAnagraficaStats(db.collection("statistics").doc(structureId), data, true),
        updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("daily").doc(getDailyId(now)), data, true),
        updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("weekly").doc(getWeekId(now)), data, true),
        updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("monthly").doc(getMonthId(now)), data, true)
      ]);
    }
  }
);

exports.onAnagraficaUpdate = onDocumentUpdated(
  { document: "anagrafica/{personId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    if (!beforeData || !afterData) return;
    
    const now = new Date();

    // 1. Handle Soft Delete
    if (!beforeData.deletedAt && afterData.deletedAt) {
      const structures = beforeData.structureIds || beforeData.canBeAccessedBy || [];
      for (const structureId of structures) {
        await Promise.all([
            updateAnagraficaStats(db.collection("statistics").doc(structureId), beforeData, false),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("daily").doc(getDailyId(now)), beforeData, false),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("weekly").doc(getWeekId(now)), beforeData, false),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("monthly").doc(getMonthId(now)), beforeData, false)
        ]);
      }
      return;
    }

    // 2. Handle Restore
    if (beforeData.deletedAt && !afterData.deletedAt) {
      const structures = afterData.structureIds || afterData.canBeAccessedBy || [];
      for (const structureId of structures) {
        await Promise.all([
            updateAnagraficaStats(db.collection("statistics").doc(structureId), afterData, true),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("daily").doc(getDailyId(now)), afterData, true),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("weekly").doc(getWeekId(now)), afterData, true),
            updateAnagraficaStats(db.collection("statistics").doc(structureId).collection("monthly").doc(getMonthId(now)), afterData, true)
        ]);
      }
      return;
    }

    // 3. Handle Regular Updates (Structure Transfer or Data Change)
    const beforeStructures = new Set(beforeData.structureIds || beforeData.canBeAccessedBy || []);
    const afterStructures = new Set(afterData.structureIds || afterData.canBeAccessedBy || []);

    // If structure removed, decrement from old
    for (const structureId of beforeStructures) {
      if (!afterStructures.has(structureId)) {
        await updateAnagraficaStats(db.collection("statistics").doc(structureId), beforeData, false);
      }
    }
    // If structure added, increment to new
    for (const structureId of afterStructures) {
      if (!beforeStructures.has(structureId)) {
        await updateAnagraficaStats(db.collection("statistics").doc(structureId), afterData, true);
      }
    }

    // If data changed within same structure
    for (const structureId of afterStructures) {
      if (beforeStructures.has(structureId)) {
        const relevantFields = ["anagrafica", "nucleoFamiliare", "legaleAbitativa", "lavoroFormazione", "vulnerabilita", "referral"];
        const isChanged = relevantFields.some(field => JSON.stringify(beforeData[field]) !== JSON.stringify(afterData[field]));
        
        if (isChanged) {
          // Decrement old values, Increment new values
          await updateAnagraficaStats(db.collection("statistics").doc(structureId), beforeData, false);
          await updateAnagraficaStats(db.collection("statistics").doc(structureId), afterData, true);
          // Note: We typically don't update historical daily/weekly stats for simple data corrections to avoid complex date logic, 
          // but we do update the TOTAL.
        }
      }
    }
  }
);

// ============================================================================
// TRIGGERS - ACCESSES
// ============================================================================

exports.onAccessCreate = onDocumentCreated(
  { document: "accessi/{accessId}", region: "europe-west8" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const structures = data.structureIds || [];
    const now = new Date();

    for (const structureId of structures) {
      await Promise.all([
        updateAccessStats(db.collection("statistics").doc(structureId), data, true),
        updateAccessStats(db.collection("statistics").doc(structureId).collection("daily").doc(getDailyId(now)), data, true),
        updateAccessStats(db.collection("statistics").doc(structureId).collection("weekly").doc(getWeekId(now)), data, true),
        updateAccessStats(db.collection("statistics").doc(structureId).collection("monthly").doc(getMonthId(now)), data, true)
      ]);
    }
  }
);

exports.onAccessUpdate = onDocumentUpdated(
  { document: "accessi/{accessId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    if (!beforeData || !afterData) return;
    const structures = afterData.structureIds || [];

    // Only update stats if services/classification changed
    if (JSON.stringify(beforeData.services) !== JSON.stringify(afterData.services)) {
      for (const structureId of structures) {
        await updateAccessStats(db.collection("statistics").doc(structureId), beforeData, false);
        await updateAccessStats(db.collection("statistics").doc(structureId), afterData, true);
      }
    }
  }
);

// ============================================================================
// TRIGGERS - REMINDERS
// ============================================================================

exports.onReminderWrite = onDocumentWritten(
  { document: "reminders/{reminderId}", region: "europe-west8" },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // 1. Deleted
    if (beforeData && !afterData) {
      if (beforeData.structureId) {
        // Just generic active count decrement logic
        const docRef = db.collection("statistics").doc(beforeData.structureId);
        await docRef.set({
             activeReminders: admin.firestore.FieldValue.increment(-1),
             updatedAt: admin.firestore.Timestamp.now()
        }, { merge: true });
      }
      return;
    }

    // 2. Created
    if (!beforeData && afterData) {
      if (afterData.structureId) {
        const now = new Date();
        const totalRef = db.collection("statistics").doc(afterData.structureId);
        const dailyRef = totalRef.collection("daily").doc(getDailyId(now));
        
        await updateReminderStats(totalRef, afterData, true, false, false);
        await updateReminderStats(dailyRef, afterData, true, false, false);
      }
      return;
    }

    // 3. Updated (Status Change)
    if (beforeData && afterData) {
      const structureId = afterData.structureId;
      if (structureId) {
        const wasCompleted = beforeData.status === "completed";
        const isNowCompleted = afterData.status === "completed";
        
        if (wasCompleted !== isNowCompleted) {
          const totalRef = db.collection("statistics").doc(structureId);
          await updateReminderStats(totalRef, afterData, false, wasCompleted, isNowCompleted);
        }
      }
    }
  }
);

// ============================================================================
// HTTP FUNCTION - RECALCULATE STATS
// ============================================================================

exports.recalculateStats = onRequest(
  { region: "europe-west8", cors: true, timeoutSeconds: 540, memory: "1GiB" }, // Increased limits for heavy calculation
  async (req, res) => {
    const structureId = req.query.structureId;
    if (!structureId) {
      res.status(400).json({ error: "structureId is required" });
      return;
    }

    console.log(`Starting recalculation for structure: ${structureId}`);

    try {
      // 1. Initialize the "Zero" State
      // We define every category object here so they exist even if empty
      const stats = {
        // Anagrafica Stats
        totalPersons: 0,
        byGender: {},
        byAgeRange: {},
        byCittadinanza: {},
        byBirthPlace: {},
        byFamilyType: {},
        byNucleoType: {},
        byChildrenCount: {},
        byLegalStatus: {},
        byHousingStatus: {},
        byJobStatus: {},
        byEducationOrigin: {},
        byEducationItaly: {},
        byItalianLevel: {},
        byVulnerability: {},
        byIntenzioneItalia: {},
        byReferral: {},

        // Access Stats
        totalAccesses: 0,
        byAccessType: {},
        bySubcategory: {},
        byClassification: {},
        byReferralEntity: {},
        totalFiles: 0,
        filesWithExpiration: 0,
        totalReminders: 0, // Access-related reminders

        // Reminder Stats (Independent collection)
        totalRemindersCreated: 0,
        activeReminders: 0,
        completedReminders: 0,
        remindersByServiceType: {},

        recalculatedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Helper for in-memory increment (slight variation to work on local object)
      const increment = (obj, key) => {
        if (!key) return;
        obj[key] = (obj[key] || 0) + 1;
      };

      // ==================================================================
      // PHASE 1: PROCESS ANAGRAFICA
      // ==================================================================
      // We check both legacy 'canBeAccessedBy' and new 'structureIds'
      const anagraficaQuery = db.collection("anagrafica")
        .where("structureIds", "array-contains", structureId); 
      
      const anagraficaSnap = await anagraficaQuery.get();

      anagraficaSnap.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip deleted users
        if (data.deletedAt) return;

        stats.totalPersons++;

        increment(stats.byGender, data.anagrafica?.sesso);
        increment(stats.byAgeRange, calculateAgeRange(data.anagrafica?.dataDiNascita));
        increment(stats.byBirthPlace, data.anagrafica?.luogoDiNascita);
        
        // Arrays
        if (Array.isArray(data.anagrafica?.cittadinanza)) {
          data.anagrafica.cittadinanza.forEach(c => increment(stats.byCittadinanza, c));
        }

        increment(stats.byFamilyType, data.nucleoFamiliare?.nucleoTipo);
        increment(stats.byNucleoType, data.nucleoFamiliare?.nucleo);

        // Children categorization logic
        const figli = data.nucleoFamiliare?.figli;
        if (figli !== undefined && figli !== null) {
          const cat = figli === 0 ? "0" : figli === 1 ? "1" : figli === 2 ? "2" : figli <= 4 ? "3-4" : "5+";
          increment(stats.byChildrenCount, cat);
        }

        increment(stats.byLegalStatus, data.legaleAbitativa?.situazioneLegale);
        if (Array.isArray(data.legaleAbitativa?.situazioneAbitativa)) {
          data.legaleAbitativa.situazioneAbitativa.forEach(s => increment(stats.byHousingStatus, s));
        }

        increment(stats.byJobStatus, data.lavoroFormazione?.situazioneLavorativa);
        increment(stats.byEducationOrigin, data.lavoroFormazione?.titoloDiStudioOrigine);
        increment(stats.byEducationItaly, data.lavoroFormazione?.titoloDiStudioItalia);
        increment(stats.byItalianLevel, data.lavoroFormazione?.conoscenzaItaliano);

        if (Array.isArray(data.vulnerabilita?.vulnerabilita)) {
          data.vulnerabilita.vulnerabilita.forEach(v => increment(stats.byVulnerability, v));
        }
        increment(stats.byIntenzioneItalia, data.vulnerabilita?.intenzioneItalia);
        increment(stats.byReferral, data.referral?.referral);
      });

      // ==================================================================
      // PHASE 2: PROCESS ACCESSES
      // ==================================================================
      const accessSnap = await db.collection("accessi")
        .where("structureIds", "array-contains", structureId)
        .get();

      accessSnap.docs.forEach(doc => {
        const data = doc.data();
        stats.totalAccesses++;

        const services = data.services || [];
        services.forEach(service => {
          increment(stats.byAccessType, service.tipoAccesso);
          
          if (Array.isArray(service.sottoCategorie)) {
            service.sottoCategorie.forEach(sub => increment(stats.bySubcategory, sub));
          }

          if (service.classificazione) {
            let k = service.classificazione;
            // Normalize classification keys if needed
            if (k.includes("Presa in carico")) k = "Presa in carico";
            else if (k.includes("Informativa")) k = "Informativa";
            else if (k.includes("Referral")) k = "Referral";
            increment(stats.byClassification, k);
          }

          increment(stats.byReferralEntity, service.enteRiferimento);

          // File counting
          if (Array.isArray(service.files)) {
             stats.totalFiles += service.files.length;
             stats.filesWithExpiration += service.files.filter(f => f.dataScadenza).length;
          }

          if (service.reminderDate) {
            stats.totalReminders++;
          }
        });
      });

      // ==================================================================
      // PHASE 3: PROCESS REMINDERS
      // ==================================================================
      const reminderSnap = await db.collection("reminders")
        .where("structureId", "==", structureId)
        .get();

      reminderSnap.docs.forEach(doc => {
        const data = doc.data();
        stats.totalRemindersCreated++;
        increment(stats.remindersByServiceType, data.serviceType);

        if (data.status === "pending") {
          stats.activeReminders++;
        } else if (data.status === "completed") {
          stats.completedReminders++;
        }
      });

      // ==================================================================
      // FINAL SAVE
      // ==================================================================
      await db.collection("statistics").doc(structureId).set(stats);

      res.json({
        success: true,
        message: "Statistics recalculated successfully",
        data: {
          persons: stats.totalPersons,
          accesses: stats.totalAccesses,
          reminders: stats.activeReminders
        }
      });

    } catch (error) {
      console.error("Error recalculating stats:", error);
      res.status(500).json({ error: error.message });
    }
  }
);