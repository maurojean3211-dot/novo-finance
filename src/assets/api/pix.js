export default async function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
return res.status(200).end();
}

try{

const body = typeof req.body === "string"
? JSON.parse(req.body)
: req.body;

const valor = body?.valor || 0;

if(!valor){
return res.status(400).json({
success:false,
erro:"Valor não informado"
});
}

const chavePix = "11999999999"; // SUA CHAVE PIX
const nome = "CUNHA";
const cidade = "ITATIBA";

function gerarPix(){

let pix =
"000201" +
"26360014BR.GOV.BCB.PIX" +
"0114" + chavePix +
"52040000" +
"5303986" +
"54" + valor.toFixed(2).length.toString().padStart(2,"0") + valor.toFixed(2) +
"5802BR" +
"59" + nome.length.toString().padStart(2,"0") + nome +
"60" + cidade.length.toString().padStart(2,"0") + cidade +
"62070503***";

function crc16(str){

let crc = 0xFFFF;

for (let c = 0; c < str.length; c++) {

crc ^= str.charCodeAt(c) << 8;

for (let i = 0; i < 8; i++) {

crc = (crc & 0x8000)
? (crc << 1) ^ 0x1021
: crc << 1;

}

}

crc &= 0xFFFF;

return crc.toString(16).toUpperCase().padStart(4,"0");

}

pix += "6304" + crc16(pix + "6304");

return pix;

}

const pixCode = gerarPix();

return res.status(200).json({
success:true,
pixCopiaECola:pixCode
});

}catch(e){

return res.status(500).json({
success:false,
erro:e.message
});

}

}