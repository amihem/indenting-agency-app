// src/styles.js

export const colors = {
  primary: "#1E3A8A",   
  secondary: "#3B82F6", 
  success: "#10B981",   
  danger: "#EF4444",    
  mustard: "#F59E0B",   
  text: "#1F2937",      
  textMuted: "#6B7280", 
  border: "#E5E7EB",    
  bg: "#F9FAFB",        
  cardBg: "#FFFFFF",    
};

export const styles = {
  app: { 
    // Ye SAP ka official font stack hai
    fontFamily: "'72', '72full', Arial,   Helvetica, sans-serif", 
    backgroundColor: colors.bg, 
    minHeight: "100vh", 
    color: colors.text, 
    paddingBottom: 20 
  },
  header: { 
    backgroundColor: colors.primary, 
    color: "#fff", 
    padding: "16px 20px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", 
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
    borderBottom: active ? `3px solid ${colors.primary}` : "3px solid transparent", 
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
