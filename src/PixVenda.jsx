import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function PixVenda(){

const chavePix = "11963068079"; // sua chave pix

const [valor,setValor] = useState("");
const [codigoPix,setCodigoPix] = useState("");

function gerarPix(){

if(!valor){
alert("Digite o valor");
return;
}

const pix = `
000201
26360014BR.GOV.BCB.PIX
0114${chavePix}
52040000
5303986
54${valor}
5802BR
5908CUNHA
6009SAOPAULO
62070503***
6304
`;

setCodigoPix(pix);

}

function copiarPix(){

navigator.clipboard.writeText(codigoPix);

alert("PIX copiado");

}

return(

<div style={{padding:"20px"}}>

<h2>Gerar PIX</h2>

<input
type="number"
placeholder="Valor da venda"
onChange={(e)=>setValor(e.target.value)}
/>

<br/><br/>

<button onClick={gerarPix}>
Gerar QR Code PIX
</button>

<br/><br/>

{codigoPix && (

<div>

<h3>Pague com PIX</h3>

<QRCodeCanvas
value={codigoPix}
size={250}
/>

<br/><br/>

<textarea
value={codigoPix}
readOnly
rows={4}
cols={40}
/>

<br/><br/>

<button onClick={copiarPix}>
Copiar PIX
</button>

</div>

)}

</div>

);

}