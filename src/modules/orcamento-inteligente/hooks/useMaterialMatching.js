import { useState } from "react";
import { getDemoExtraction } from "../services/document-processing.service";
export default function useMaterialMatching() { const [extraction, setExtraction] = useState(getDemoExtraction); const decide = (index, decision) => setExtraction((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, decision } : item) })); return { extraction, decide }; }
