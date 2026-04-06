type Row = {
  transaction: string;
  flat: string;
  tiered: string;
  difference: string;
  flatWins: boolean;
};

const rows: Row[] = [
  { transaction: "$1M",  flat: "$12,500",  tiered: "$50,000",  difference: "Flat saves $37,500", flatWins: true },
  { transaction: "$5M",  flat: "$62,500",  tiered: "$150,000", difference: "Flat saves $87,500", flatWins: true },
  { transaction: "$10M", flat: "$125,000", tiered: "$200,000", difference: "Flat saves $75,000", flatWins: true },
  { transaction: "$25M", flat: "$312,500", tiered: "$350,000", difference: "Flat saves $37,500",   flatWins: true  },
  { transaction: "$50M", flat: "$625,000", tiered: "$600,000", difference: "Tiered saves $25,000",   flatWins: false  },
];

export default function FeeStructureTable() {
  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 14, padding: "1rem 0" }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: "1rem", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <span>
          <span style={{ background: "#E1F5EE", color: "#0F6E56", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Flat rate
          </span>
          &nbsp; 1.25% on full transaction value
        </span>
        <span>
          <span style={{ background: "#FAECE7", color: "#993C1D", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
            Tiered rate
          </span>
          &nbsp; 5% (0–1M) · 4% (1–2M) · 3% (2–3M) · 2% (3–4M) · 1% (4M+)
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {["Transaction", "Flat 1.25%", "Tiered", "Difference"].map((h, i) => (
              <th key={h} style={{
                width: i === 0 ? "22%" : "26%",
                fontWeight: 500,
                fontSize: 12,
                color: "#666",
                textAlign: i === 0 ? "left" : "right",
                padding: "8px 12px",
                borderBottom: "0.5px solid #e0e0e0",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.transaction}>
              <td style={{ padding: "10px 12px", fontWeight: 500, borderBottom: i < rows.length - 1 ? "0.5px solid #e0e0e0" : "none" }}>
                {row.transaction}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: i < rows.length - 1 ? "0.5px solid #e0e0e0" : "none", color: row.flatWins ? "#0F6E56" : "#c0392b", fontWeight: row.flatWins ? 500 : 400 }}>
                {row.flat}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: i < rows.length - 1 ? "0.5px solid #e0e0e0" : "none", color: !row.flatWins ? "#0F6E56" : "#c0392b", fontWeight: !row.flatWins ? 500 : 400 }}>
                {row.tiered}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: i < rows.length - 1 ? "0.5px solid #e0e0e0" : "none", color: row.flatWins ? "#0F6E56" : "#c0392b", fontWeight: row.flatWins ? 500 : 400 }}>
                {row.difference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
