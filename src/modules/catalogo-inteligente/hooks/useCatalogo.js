import { useCallback, useEffect, useMemo, useState } from "react";
import { filterAndSortMaterials, listMaterials, saveMaterial } from "../services/catalogo.service";

const PAGE_SIZE=6;
export default function useCatalogo({empresaId,userId}){
  const[materials,setMaterials]=useState([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");
  const[filters,setFilters]=useState({search:"",category:"Todas",status:"Todos",sortBy:"codigo"});const[page,setPage]=useState(1);
  const reload=useCallback(async()=>{if(!empresaId){setMaterials([]);setLoading(false);return}setLoading(true);try{setMaterials(await listMaterials(empresaId));setError("")}catch(reason){setError(reason.message||"Não foi possível carregar o catálogo.")}finally{setLoading(false)}},[empresaId]);
  useEffect(()=>{const timer=window.setTimeout(reload,0);return()=>window.clearTimeout(timer)},[reload]);
  const filteredMaterials=useMemo(()=>filterAndSortMaterials(materials,filters),[materials,filters]);const pageCount=Math.max(1,Math.ceil(filteredMaterials.length/PAGE_SIZE));const visibleMaterials=filteredMaterials.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  function updateFilters(nextFilters){setFilters((current)=>({...current,...nextFilters}));setPage(1)}
  async function addMaterial(material){const created=await saveMaterial({empresaId,userId,material});await reload();return created}
  return{materials,filters,updateFilters,page,setPage,pageCount,filteredMaterials,visibleMaterials,addMaterial,loading,error,reload};
}
