import { supabase } from "../../../supabase";

const number = (value) => value === "" || value == null ? null : Number(value);

export function mapCatalogProduct(row) {
  return { id:row.id,supplierCode:row.codigo,marketCode:row.codigo,name:row.nome,description:row.descricao||row.nome,category:row.categoria||"",status:row.status,supplierName:row.fornecedor_principal||"",technical:row.dados_tecnicos||{},commercial:row.dados_comerciais||{},source:row.dados_origem||{} };
}

export function mapMaterial(row) {
  const technical=row.dados_tecnicos||{};const commercial=row.dados_comerciais||{};const dimensions=technical.dimensions||{};
  return{id:row.id,codigo:row.codigo,descricao:row.descricao||row.nome,categoria:row.categoria||"",liga:technical.alloy||"",tempera:technical.temper||"",formato:technical.format||"",diametro:dimensions.externalDiameter??"",largura:dimensions.width??dimensions.a??"",altura:dimensions.height??dimensions.b??"",espessura:dimensions.thickness??dimensions.c??"",comprimento:dimensions.length??"",pesoPorMetro:technical.weightPerMeter??"",pesoPorBarra:technical.weightPerPiece??"",pesoUnitario:technical.weightPerPiece??"",unidade:commercial.salesUnit||"kg",fornecedorPrincipal:row.fornecedor_principal||"",fornecedoresAlternativos:commercial.alternativeSuppliers||"",precoCompra:commercial.costPerKg??"",precoSugerido:commercial.pricePerPiece??commercial.pricePerKg??commercial.pricePerMeter??"",margemPadrao:commercial.defaultMargin??"",estoqueMinimo:commercial.minimumStock??"",estoqueAtual:commercial.stockQuantity??"",localizacao:commercial.location||"",observacoes:commercial.notes||"",status:row.status,atualizadoEm:row.updated_at};
}

export async function listCatalogProducts(empresaId){if(!empresaId)return[];const{data,error}=await supabase.from("catalogo_produtos").select("*").eq("empresa_id",String(empresaId)).order("codigo");if(error)throw error;return(data||[]).map(mapCatalogProduct)}
export async function listMaterials(empresaId){if(!empresaId)return[];const{data,error}=await supabase.from("catalogo_produtos").select("*").eq("empresa_id",String(empresaId)).order("codigo");if(error)throw error;return(data||[]).map(mapMaterial)}

export async function saveMaterial({empresaId,userId,material}){
  const dimensions={externalDiameter:number(material.diametro),width:number(material.largura),height:number(material.altura),thickness:number(material.espessura),length:number(material.comprimento),originalText:[material.largura,material.altura,material.espessura].filter(Boolean).join(" x ")};
  const payload={empresa_id:String(empresaId),user_id:userId,codigo:material.codigo.trim(),nome:material.descricao.trim(),descricao:material.descricao.trim(),categoria:material.categoria||null,status:material.status||"Ativo",fornecedor_principal:material.fornecedorPrincipal||null,dados_tecnicos:{alloy:material.liga||null,temper:material.tempera||null,format:material.formato||null,dimensions,weightPerMeter:number(material.pesoPorMetro),weightPerPiece:number(material.pesoPorBarra||material.pesoUnitario)},dados_comerciais:{salesUnit:material.unidade||"kg",costPerKg:number(material.precoCompra),pricePerPiece:number(material.precoSugerido),defaultMargin:number(material.margemPadrao),minimumStock:number(material.estoqueMinimo),stockQuantity:number(material.estoqueAtual),location:material.localizacao||null,notes:material.observacoes||null,alternativeSuppliers:material.fornecedoresAlternativos||null},updated_at:new Date().toISOString()};
  const query=material.id?supabase.from("catalogo_produtos").update(payload).eq("id",material.id).eq("empresa_id",String(empresaId)):supabase.from("catalogo_produtos").insert(payload);const{data,error}=await query.select("*").single();if(error)throw error;return mapMaterial(data)
}

export async function publishImportedProducts({empresaId,userId,products}){
  const rows=products.filter((item)=>item.selected&&item.duplicateAction!=="IGNORE").map((item)=>({empresa_id:String(empresaId),user_id:userId,codigo:String(item.supplierCode||item.marketCode||item.id),nome:item.name||item.description,descricao:item.description||item.name,categoria:item.category||null,status:item.status==="IGNORED"?"Inativo":"Ativo",fornecedor_principal:item.supplierName||null,dados_tecnicos:item.technical||{},dados_comerciais:item.commercial||{},dados_origem:item.source||{},updated_at:new Date().toISOString()}));if(!rows.length)return 0;const{error}=await supabase.from("catalogo_produtos").upsert(rows,{onConflict:"empresa_id,codigo"});if(error)throw error;return rows.length
}

export function filterAndSortMaterials(materials,{search,category,status,sortBy}){const term=search.trim().toLocaleLowerCase("pt-BR");const filtered=materials.filter((material)=>{const matchesTerm=!term||[material.codigo,material.descricao,material.liga,material.fornecedorPrincipal].some((value)=>String(value||"").toLocaleLowerCase("pt-BR").includes(term));return matchesTerm&&(category==="Todas"||material.categoria===category)&&(status==="Todos"||material.status===status)});return[...filtered].sort((a,b)=>sortBy==="descricao"?a.descricao.localeCompare(b.descricao,"pt-BR"):sortBy==="estoque"?Number(a.estoqueAtual||0)-Number(b.estoqueAtual||0):sortBy==="preco"?Number(b.precoSugerido||0)-Number(a.precoSugerido||0):a.codigo.localeCompare(b.codigo,"pt-BR"))}
