
'use server';

export async function getData(structure) {
  //TODO : fare check permessi
  const admin = (await import("@/lib/firebase/firebaseAdmin")).default;
  const snap = await admin
    .firestore()
    .collection("anagrafica")
    .where("canBeAccessedBy", "array-contains", structure)
    .get();

    const snapshot = snap.docs.map(doc => {
  const d = doc.data();
  return {
    id: doc.id,
    ...JSON.parse(JSON.stringify(d)), // forza JSON pulito
  };
});
  return JSON.stringify(snapshot);
}