export const SAAS_BENCHMARKS = {
    revenue: 100000000,
    context: "SaaS Company @ $100M ARR Scale",
    metrics: [
        {
            name: "Gross Margin",
            topQuartile: 0.85,
            median: 0.78,
            bottomQuartile: 0.65,
            description: "Gross Profit / Total Revenue"
        },
        {
            name: "R&D as % of Revenue",
            topQuartile: 0.15, // Efficient
            median: 0.22,
            bottomQuartile: 0.35, // Low efficiency or High Growth Investment
            description: "Research & Development Spend / Total Revenue"
        },
        {
            name: "S&M as % of Revenue",
            topQuartile: 0.28,
            median: 0.40,
            bottomQuartile: 0.55,
            description: "Sales & Marketing Spend / Total Revenue"
        },
        {
            name: "G&A as % of Revenue",
            topQuartile: 0.08,
            median: 0.12,
            bottomQuartile: 0.18,
            description: "General & Administrative Spend / Total Revenue"
        },
        {
            name: "Rule of 40",
            topQuartile: 0.50,
            median: 0.40,
            bottomQuartile: 0.20,
            description: "Growth Rate % + FCF Margin %"
        },
        {
            name: "Magic Number",
            topQuartile: 1.2,
            median: 0.9,
            bottomQuartile: 0.6,
            description: "Net New ARR / Previous Q S&M Spend"
        }
    ]
};
