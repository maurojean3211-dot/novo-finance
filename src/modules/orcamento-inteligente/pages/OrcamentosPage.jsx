import { useState } from "react";
import { EmptyState, MetricGrid, OperationModal } from "../../../components/operations/OperationsUI";
import OrcamentoFilters from "../components/OrcamentoFilters";
import OrcamentoHeader from "../components/OrcamentoHeader";
import OrcamentoTable from "../components/OrcamentoTable";
import useOrcamentos from "../hooks/useOrcamentos";
import AprovacaoOrcamentoPage from "./AprovacaoOrcamentoPage";
import FormacaoPrecoPage from "./FormacaoPrecoPage";
import HistoricoOrcamentoPage from "./HistoricoOrcamentoPage";
import NovoOrcamentoPage from "./NovoOrcamentoPage";
import OrcamentoDetailsPage from "./OrcamentoDetailsPage";
import PropostaPreviewPage from "./PropostaPreviewPage";
import RevisaoMateriaisPage from "./RevisaoMateriaisPage";
import { formatMoney } from "../utils/money-calculations";
import "../orcamento-inteligente.css";

export default function OrcamentosPage() {
  const manager=useOrcamentos(); const [screen,setScreen]=useState("list"); const [selectedId,setSelectedId]=useState(null); const [view,setView]=useState("table"); const [importOpen,setImportOpen]=useState(false); const [page,setPage]=useState(1); const selected=manager.quotes.find((quote)=>quote.id===selectedId)||manager.quotes[0]; const pageSize=4; const pageCount=Math.max(1,Math.ceil(manager.filtered.length/pageSize)); const visible=manager.filtered.slice((page-1)*pageSize,page*pageSize);
  const open=(quote)=>{setSelectedId(quote.id);setScreen("details")}; const save=(quote)=>{const saved=manager.saveQuote(quote);setSelectedId(saved.id);setScreen("details")};
  if(screen==="new") return <NovoOrcamentoPage onSave={save} onBack={()=>setScreen("list")}/>;
  if(screen==="review") return <RevisaoMateriaisPage onBack={()=>setScreen("details")} onNext={()=>setScreen("pricing")}/>;
  if(screen==="pricing") return <FormacaoPrecoPage onBack={()=>setScreen("review")} onNext={()=>setScreen("approval")}/>;
  if(screen==="approval") return <AprovacaoOrcamentoPage quote={selected} onBack={()=>setScreen("pricing")} onNext={()=>setScreen("proposal")}/>;
  if(screen==="proposal") return <PropostaPreviewPage quote={selected} onBack={()=>setScreen("approval")} onHistory={()=>setScreen("history")}/>;
  if(screen==="history") return <HistoricoOrcamentoPage onBack={()=>setScreen("proposal")} onHome={()=>setScreen("list")}/>;
  if(screen==="details") return <OrcamentoDetailsPage quote={selected} onBack={()=>setScreen("list")} onStatus={manager.updateStatus} onReview={()=>setScreen("review")} onPricing={()=>setScreen("pricing")} onApproval={()=>setScreen("approval")} onProposal={()=>setScreen("proposal")} onHistory={()=>setScreen("history")}/>;
  return <main className="ops-page quote-page"><OrcamentoHeader onNew={()=>setScreen("new")} onImport={()=>setImportOpen(true)}/><div className="quote-demo-note"><span/> Fluxo demonstrativo · dados mantidos somente em memória</div><MetricGrid items={[{label:"Em aberto",value:manager.metrics.abertos,detail:"orçamentos ativos",icon:"▤"},{label:"Aguardando análise",value:manager.metrics.analise,detail:"revisão pendente",icon:"◎",tone:"amber"},{label:"Aguardando aprovação",value:manager.metrics.aprovacao,detail:"alçada pendente",icon:"✓"},{label:"Enviados",value:manager.metrics.enviados,detail:"com o cliente",icon:"↗"},{label:"Aceitos",value:manager.metrics.aceitos,detail:"negócios aprovados",icon:"◆",tone:"green"},{label:"Vencidos",value:manager.metrics.vencidos,detail:"exigem retorno",icon:"!",tone:"rose"},{label:"Em negociação",value:formatMoney(manager.metrics.negociacao),detail:"valor potencial",icon:"R$",tone:"green"},{label:"Margem média",value:`${manager.metrics.margem.toFixed(1)}%`,detail:"demonstrativa",icon:"%"}]}/><OrcamentoFilters filters={manager.filters} onChange={(filters)=>{manager.setFilters(filters);setPage(1)}} onClear={manager.clearFilters} quotes={manager.quotes}/><div className="quote-viewbar"><div><strong>Central de Orçamentos</strong><span>{manager.filtered.length} resultado(s)</span></div><div><button className={view==="table"?"active":""} onClick={()=>setView("table")}>Tabela</button><button className={view==="cards"?"active":""} onClick={()=>setView("cards")}>Cards</button></div></div>{view==="table"?<OrcamentoTable quotes={visible} onOpen={open}/>:visible.length?<div className="quote-cards">{visible.map((quote)=><article key={quote.id} onClick={()=>open(quote)}><small>{quote.id} · {quote.origem}</small><strong>{quote.cliente}</strong><span className="quote-status">{quote.status}</span><div><b>{formatMoney(quote.valor)}</b><em>{quote.margem}% margem</em></div><footer>{quote.vendedor}<span>Validade {quote.validade}</span></footer></article>)}</div>:<section className="ops-panel"><EmptyState title="Nenhum orçamento encontrado"/></section>}<div className="quote-pagination"><button disabled={page===1} onClick={()=>setPage((current)=>current-1)}>Anterior</button><span>Página {page} de {pageCount}</span><button disabled={page===pageCount} onClick={()=>setPage((current)=>current+1)}>Próxima</button></div>{importOpen&&<OperationModal title="Importar PDF/Imagem" onClose={()=>setImportOpen(false)} onSubmit={()=>setImportOpen(false)} submitLabel="Entendi"><div className="quote-upload-demo"><span>PDF / IMG</span><strong>Importação demonstrativa</strong><p>Upload, OCR e IA serão implementados em fases futuras. Nenhum arquivo é selecionado ou enviado nesta tela.</p></div></OperationModal>}</main>;
}
