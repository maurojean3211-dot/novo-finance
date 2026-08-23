import { useState } from "react";
import { getMaterialExtraction, MATERIAL_DOCUMENT_PROCESSING_AVAILABLE } from "../services/document-processing.service";
export default function useMaterialMatching() { const [extraction, setExtraction] = useState(getMaterialExtraction); const decide = (index, decision) => setExtraction((current) => current ? ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, decision } : item) }) : null); return { extraction, decide, available: MATERIAL_DOCUMENT_PROCESSING_AVAILABLE }; }
