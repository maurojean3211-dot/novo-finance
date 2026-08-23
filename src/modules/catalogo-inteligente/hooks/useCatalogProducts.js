import { useEffect, useState } from "react";
import { listCatalogProducts } from "../services/catalogo.service";
export default function useCatalogProducts(empresaId){const[products,setProducts]=useState([]);useEffect(()=>{const timer=window.setTimeout(()=>{listCatalogProducts(empresaId).then(setProducts).catch(()=>setProducts([]))},0);return()=>window.clearTimeout(timer)},[empresaId]);return products}
