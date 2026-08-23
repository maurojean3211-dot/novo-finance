import { useCallback, useEffect, useMemo, useState } from "react";
import useExecutiveDashboard from "../../../hooks/useExecutiveDashboard";
import useAgendaActivities from "../../agenda-comercial/hooks/useAgendaActivities";
import { listCatalogProducts } from "../../catalogo-inteligente/services/catalogo.service";
import { listOpportunities } from "../../crm-comercial/services/crm.service";
import { loadProspects } from "../../prospeccao-comercial/services/prospeccao.service";
import { listCustomers } from "../../../services/customer.service";
import { analyzeCommercialCommand, buildDailySummary } from "../services/commercialAssistantRules.service";
import { deleteAttendanceEntry, loadAttendanceHistory, saveAttendanceEntry } from "../services/commercialAttendance.service";

export default function useCommercialAssistant({empresaId,userId}){
  const dashboard=useExecutiveDashboard(empresaId);const agenda=useAgendaActivities({empresaId,userId});
  const[customers,setCustomers]=useState([]);const[prospects,setProspects]=useState([]);const[products,setProducts]=useState([]);const[opportunities,setOpportunities]=useState([]);const[history,setHistory]=useState([]);const[loadingContext,setLoadingContext]=useState(true);
  const loadContext=useCallback(async()=>{if(!empresaId||!userId){setLoadingContext(false);return}setLoadingContext(true);try{const[customerData,prospectData,productData,opportunityData]=await Promise.all([listCustomers(empresaId),loadProspects({empresaId,userId}),listCatalogProducts(empresaId),listOpportunities(empresaId)]);setCustomers(customerData);setProspects(prospectData);setProducts(productData);setOpportunities(opportunityData)}finally{setLoadingContext(false)}},[empresaId,userId]);
  const loadHistory=useCallback(async()=>{try{setHistory(await loadAttendanceHistory(empresaId,userId))}catch{setHistory([])}},[empresaId,userId]);
  useEffect(()=>{const timer=window.setTimeout(loadContext,0);return()=>window.clearTimeout(timer)},[loadContext]);
  useEffect(()=>{const timer=window.setTimeout(loadHistory,0);return()=>window.clearTimeout(timer)},[loadHistory]);
  const context=useMemo(()=>({customers,prospects,products,opportunities,agenda:agenda.activities,sales:dashboard.vendas,purchases:dashboard.compras,receivables:dashboard.recebimentos,movements:dashboard.lancamentos}),[agenda.activities,customers,dashboard.compras,dashboard.lancamentos,dashboard.recebimentos,dashboard.vendas,opportunities,products,prospects]);
  const record=useCallback(async(entry)=>{const saved=await saveAttendanceEntry(empresaId,userId,entry);setHistory((current)=>[saved,...current.filter((item)=>item.id!==saved.id)].slice(0,30));return saved},[empresaId,userId]);
  const analyze=useCallback((command)=>{const result=analyzeCommercialCommand(command,context);void record({command,result});return result},[context,record]);
  const dailySummary=useCallback(()=>{const result=buildDailySummary(context);void record({command:"Gerar resumo comercial do dia",result});return result},[context,record]);
  const addAttendance=useCallback((analysis,summary)=>record({command:`Atendimento: ${analysis.form.client||analysis.form.company||"sem identificação"}`,result:{title:analysis.classification,message:summary,source:"Atendimento persistente"},attendance:analysis}),[record]);
  const removeHistory=useCallback(async(id)=>{await deleteAttendanceEntry(empresaId,userId,id);setHistory((current)=>current.filter((item)=>item.id!==id));},[empresaId,userId]);
  return{context,history,analyze,dailySummary,addAttendance,removeHistory,loading:dashboard.loading||agenda.loading||loadingContext};
}
