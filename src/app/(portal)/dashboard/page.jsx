'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseClient";
import { SectionCards } from "@/components/section-cards";
import { Card, CardTitle } from "@/components/ui/card";
import Link from "next/link";
export default function Page() {
  const [structures, setStructures] = useState([]);
  const [cardsData, setCardsData] = useState([]);

  // Fetch structures assigned to the user
  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const snapshot = await getDocs(collection(db, "structures"));
        const structuresList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStructures(structuresList);
      } catch (err) {
        console.error("Error fetching structures:", err);
      }
    };
    fetchStructures();
  }, []);

  // Fetch number of people and staff per structure
  useEffect(() => {
    const fetchCardsData = async () => {
      if (structures.length === 0) return;

      const dataPromises = structures.map(async (structure) => {
        // Count people in the structure
        const peopleSnapshot = await getDocs(
          query(collection(db, "anagrafica"), where("structureIds", "array-contains", structure.id))
        );
        const peopleCount = peopleSnapshot.size;

        // Count staff members for the structure
        const staffSnapshot = await getDocs(
          query(collection(db, "operators"), where("structureIds", "array-contains", structure.id))
        );
        const staffCount = staffSnapshot.size;

        return {
          ...structure,
          peopleCount,
          staffCount
        };
      });

      const results = await Promise.all(dataPromises);
      setCardsData(results);
    };

    fetchCardsData();
  }, [structures]);

  return (
    <>
    {/*   <SectionCards
        title="Strutture Assegnate"
        description="Visualizza le strutture di cui sei responsabile con il numero di persone e staff."
      /> */}

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4  *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {cardsData.map((structure) => (
          <Link href={`/${structure.id}/dashboard`} key={structure.id}>
            <Card  className="border gap-2 rounded-lg p-4 shadow hover:shadow-lg transition">
              <CardTitle className="text-xl font-semibold ">{structure.name || structure.id}</CardTitle>
              <p className="text-gray-600">Persone in carico: {structure.peopleCount}</p>
              <p className="text-gray-600">Staff: {structure.staffCount}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}