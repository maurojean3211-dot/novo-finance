import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#ff4d4f", "#faad14", "#52c41a", "#1890ff"];

export default function GraficoDespesas({ dados }) {
  return (
    <PieChart width={400} height={300}>
      <Pie
        data={dados}
        dataKey="valor"
        nameKey="categoria"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label
      >
        {dados.map((entry, index) => (
          <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>

      <Tooltip />
      <Legend />
    </PieChart>
  );
}