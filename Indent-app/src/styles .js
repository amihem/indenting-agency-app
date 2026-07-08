// src/styles.js

export const colors = {
  primary: "#1E3A8A",
  primaryDark: "#0F2A47",   // deep navy — header / hero
  secondary: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
  mustard: "#F59E0B",
  gold: "#FBBF24",          // accent for hero labels
  indigo: "#7C3AED",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  cardBg: "#FFFFFF",
};

// Palette used for the colourful quick-action tiles / left-border stat cards
export const accentColors = {
  blue: "#2563EB",
  green: "#059669",
  red: "#EF4444",
  purple: "#7C3AED",
  orange: "#EA580C",
  teal: "#0D9488",
};

export const styles = {
  app: { 
    // Inter is the closest free match to SAP's proprietary "72" font.
    // Load it once in index.html: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    fontFamily: "'Inter', '72', '72full', Arial, Helvetica, sans-serif", 
    backgroundColor: colors.bg, 
    minHeight: "100vh", 
    color: colors.text, 
    paddingBottom: 20 
  },
  header: { 
    background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`,
    color: "#fff", 
    padding: "16px 20px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    boxShadow: "0 4px 10px -2px rgba(15,42,71,0.35)", 
    zIndex: 10 
  },
  brand: { 
    fontSize: 18, 
    fontWeight: 700, 
    display: "flex", 
    alignItems: "center", 
    gap: 8 
  },
  tabBar: { 
    display: "flex", 
    overflowX: "auto", 
    backgroundColor: "#fff", 
    borderBottom: `1px solid ${colors.border}`, 
    padding: "0 10px", 
    scrollbarWidth: "none", 
    WebkitOverflowScrolling: "touch"
  },
  tabBtn: (active) => ({ 
    padding: "14px 16px", 
    border: "none", 
    backgroundColor: "transparent", 
    borderBottom: active ? `3px solid ${colors.gold}` : "3px solid transparent", 
    color: active ? colors.primary : colors.textMuted, 
    fontWeight: active ? 700 : 500, 
    fontSize: 14, 
    cursor: "pointer", 
    whiteSpace: "nowrap", 
    transition: "all 0.2s ease" 
  }),
  main: { 
    padding: 16, 
    maxWidth: 1200, 
    margin: "0 auto" 
  },
  statGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
    gap: 12, 
    marginBottom: 20 
  },
  statCard: { 
    backgroundColor: colors.cardBg, 
    border: `1px solid ${colors.border}`, 
    borderRadius: 12, 
    padding: 16, 
    display: "flex", 
    flexDirection: "column", 
    justifyContent: "center", 
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" 
  },
  statLabel: { 
    fontSize: 12, 
    color: colors.textMuted, 
    marginBottom: 6, 
    fontWeight: 600 
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: 800, 
    color: colors.text 
  },

  /* ---------- New: dashboard hero / accent cards / action tiles ---------- */
  heroCard: {
    background: `linear-gradient(135deg, ${colors.primaryDark} 0%, ${colors.primary} 100%)`,
    color: "#fff",
    borderRadius: 18,
    padding: "26px 22px",
    marginBottom: 20,
    boxShadow: "0 12px 28px -8px rgba(15,42,71,0.45)",
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: colors.gold,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: 800,
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
  },
  tileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  statCardAccent: (accent) => ({
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderLeft: `4px solid ${accent}`,
    padding: "16px 16px 16px 14px",
    boxShadow: "0 2px 10px -2px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  }),
  iconBadge: (bg) => ({
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 17,
    marginBottom: 6,
  }),
  actionTile: (bg) => ({
    backgroundColor: bg,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "22px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 14px -4px rgba(0,0,0,0.2)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    width: "100%",
  }),
  actionTileIcon: {
    fontSize: 26,
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: `1px solid ${colors.border}`,
  },
  card: { 
    backgroundColor: colors.cardBg, 
    border: `1px solid ${colors.border}`, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16, 
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" 
  },
  sectionHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 16, 
    flexWrap: "wrap", 
    gap: 10 
  },
  h2: { 
    fontSize: 18, 
    fontWeight: 700, 
    margin: 0, 
    color: colors.text 
  },
  row2: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
    gap: 12, 
    marginBottom: 12 
  },
  row3: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
    gap: 12, 
    marginBottom: 12 
  },
  label: { 
    display: "block", 
    fontSize: 12, 
    fontWeight: 600, 
    color: colors.textMuted, 
    marginBottom: 4 
  },
  input: { 
    width: "100%", 
    padding: "10px 12px", 
    border: `1px solid ${colors.border}`, 
    borderRadius: 8, 
    fontSize: 14, 
    boxSizing: "border-box", 
    marginBottom: 12, 
    backgroundColor: "#F9FAFB", 
    transition: "border-color 0.2s", 
    outline: "none" 
  },
  btn: { 
    backgroundColor: colors.primary, 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    padding: "10px 16px", 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: "pointer", 
    transition: "opacity 0.2s" 
  },
  btnGhost: { 
    backgroundColor: "transparent", 
    color: colors.primary, 
    border: `1px solid ${colors.border}`, 
    borderRadius: 8, 
    padding: "10px 16px", 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: "pointer" 
  },
  btnDanger: { 
    backgroundColor: "#FEE2E2", 
    color: colors.danger,       
    border: "none", 
    borderRadius: 6, 
    padding: "6px 12px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer" 
  },
  btnPdf: { 
    backgroundColor: "#F3F4F6", 
    color: colors.text, 
    border: `1px solid ${colors.border}`, 
    borderRadius: 6, 
    padding: "6px 12px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer" 
  },
  btnWhatsapp: { 
    backgroundColor: "#DCF8C6", 
    color: "#075E54",          
    border: "none", 
    borderRadius: 6, 
    padding: "6px 12px", 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: "pointer" 
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse", 
    fontSize: 13 
  },
  th: { 
    textAlign: "left", 
    padding: "10px 8px", 
    borderBottom: `2px solid ${colors.border}`, 
    color: colors.textMuted, 
    fontWeight: 600, 
    whiteSpace: "nowrap" 
  },
  td: { 
    padding: "12px 8px", 
    borderBottom: `1px solid ${colors.border}`, 
    color: colors.text 
  },
  listItem: { 
    border: `1px solid ${colors.border}`, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 12, 
    backgroundColor: colors.cardBg,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)"
  },
  badge: (bg, fg) => ({ 
    backgroundColor: bg, 
    color: fg, 
    padding: "4px 8px", 
    borderRadius: 4, 
    fontSize: 11, 
    fontWeight: 700, 
    display: "inline-block" 
  })
};

export const statusColors = {
  pending: ["#FEF3C7", "#D97706"],          
  confirmed: ["#E0F2FE", "#0284C7"],        
  partial_dispatch: ["#DBEAFE", "#2563EB"], 
  fulfilled: ["#D1FAE5", "#059669"],        
  closed: ["#F3F4F6", "#4B5563"],           
  cancelled: ["#FEE2E2", "#DC2626"],        
};
